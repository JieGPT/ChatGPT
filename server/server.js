import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import { Configuration, OpenAIApi } from 'openai';

dotenv.config();

const serverConfig = await import("./server-config.json", {
    assert: {
        type: "json",
    },
}).then(result => {return result.default;}).catch(e => console.log("Config file server-config.json not found."));


const openaiApikey = serverConfig ? serverConfig.open_ai_config.OPENAI_API_KEY : process.env.OPENAI_API_KEY;

console.log(`apiKey:<${openaiApikey}>`);

 

const configuration = new Configuration({
    apiKey: openaiApikey
});


const openai = new OpenAIApi(configuration);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
    res.status(200).send({
        message: 'Hello from OpenAI',
    })
});

app.post('/', async (req, res) => {
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

        res.status(200).send({
            bot: response.data.choices[0].text
        });

    } catch (error) {
        console.log(error);
        res.status(500).send({ error });
    }
});

app.listen(5080, () => console.log('Server is running on port http://localhost:5080'));