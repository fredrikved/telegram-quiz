import { config } from "dotenv";
import Fuse from "fuse.js";
import TelegramBot from "node-telegram-bot-api"
import { Quiz } from "./quiz";
import { one } from "./quiz/quizes";
config()

const token = process.env.BOT_TOKEN

if (!token) {
    console.error("Bot token is not present...")
    process.exit()
}

const bot = new TelegramBot(token, {polling: true})

const quiz = new Quiz(one)

bot.onText(/(.*)/, (msg, match) => {
    if (match?.[0] === "start") {
        bot.sendMessage(msg.chat.id, quiz.currentQuestion.question)
    }

    if (match) {
        if (quiz.answer(msg.from!.id, match[0])) {
            bot.sendMessage(msg.chat.id, "hey! thats correct! stand by for a new one!")

            setTimeout(() => {
                const q = quiz.nextQuestion()
                if (q) {
                    bot.sendMessage(msg.chat.id, q)
                }
            }, 2000)
        }
    }
})

bot.on("polling_error", (err) => {
    console.log(err)
})