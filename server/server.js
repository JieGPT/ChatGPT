import express from 'express';
import * as dotenv from 'dotenv';
import { Configuration, OpenAIApi } from 'openai';
import redis from 'redis';
import { v4 as uuid } from 'uuid';
import cookieParser from 'cookie-parser';

dotenv.config();

// redis client
const client = redis.createClient({
    url: process.env.REDIS_URL ? process.env.REDIS_URL : ''
});



const openaiApikey = process.env.OPENAI_API_KEY;

const port = process.env?.PORT ? process.env.PORT : 5080

const configuration = new Configuration({
    apiKey: openaiApikey
});

const openai = new OpenAIApi(configuration);

const app = express();


app.use(express.json());
app.use(cookieParser())

app.use((req, res, next) => {
    if (req.method === 'OPTIONS') { next(); return }
    let sessionId = req.cookies?.sessionId;

    if (!sessionId) {
        sessionId = uuid(); // Generate a unique session id
        res.cookie('sessionId', sessionId, {
            sameSite: 'none',
            secure: true
        }); // Set the session id in the cookie
    }
    req.sessionId = sessionId;
    next();
});

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_HOST); // Replace with your frontend URL
    res.setHeader('Access-Control-Allow-Credentials', 'true'); // Enable sending cookies
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, X-authentication, X-client, Authorization')
    next();
});

app.get('/api/ping', async (req, res) => {
    res.status(200).send({
        message: 'Hello from OpenAI',
    })
});

app.get('/api/history', async(req, res) => {
    console.log(req.sessionId)
    if (!req.sessionId) {
        res.status(200).send()
    } else {
        const sessionId = req.sessionId
        const hist = await client.zRange(sessionId, 0, -1)
        const jsonData =[]
        hist.forEach((item)=> {
           jsonData.push(JSON.parse(item))
        })
        console.log(jsonData)
        res.status(200).send(jsonData);
    }
})

app.options('/')
app.post('/api/ask', async (req, res) => {
    try {
        const prompt = req.body.prompt;

        const response = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: `${prompt}`,
            temperature: 0,
            max_tokens: 3000,
            top_p: 1,
            frequency_penalty: 0.5,
            presence_penalty: 0,
        });


        const sessionId = req.sessionId

        const message = {
            user: prompt,
            bot: response.data.choices[0].text
        }

        // Save the updated chat history
        client.zAdd(sessionId, {score: Date.now(), value:JSON.stringify(message)});



        res.status(200).send(message);

    } catch (error) {
        console.log(error);
        res.status(500).send({ error });
    }
});

await client.connect()
app.listen(port, () => console.log('Server is running on port http://0.0.0.0:' + port));
