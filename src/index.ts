import { config } from "dotenv";
import TelegramBot from "node-telegram-bot-api"
import { Quiz, Score } from "./quiz";
import { one, two } from "./quiz/quizes";
config()

const token = process.env.BOT_TOKEN

if (!token) {
    console.error("Bot token is not present...")
    process.exit()
}

const bot = new TelegramBot(token, {polling: true})

const response = (answer: string, name: string) => {
    const spacer = "🎉🎉🎉        🎉🎉🎉"

    return `${spacer}\n\nRiktig, ${name}!\n\nSvaret var: <b>${answer}</b>.\n\n${spacer}`;
}

const quizes: {
    [key: number]: Quiz
} = {}

const getOrSetQuiz = (chatId: number) => {
    return quizes[chatId] ??= new Quiz("two-" + chatId, two)
}

const scoreboard = async (chatId: number, scores: Score[]) => {
    const users: {
        place: number,
        name: string,
        score: number,
    }[] = []

    for (let i = 0; i < scores.length; i++) {
        if (i > 9) {
            break
        }
        const score = scores[i]
        const user = await bot.getChatMember(chatId, score.userId)
        users.push({
            place: i + 1,
            name: `${user.user.first_name} ${user.user.last_name ?? ""}`,
            score: score.score
        })
    }
    await bot.sendMessage(
        chatId, users.map(u => `${u.place}. ${u.name} - ${u.score}`).join("\n"))
}

const disappointedStrings = [
    "Var den for vanskelig?",
    "Oops, her var det svakt oppmøte.",
    "Og dere som trodde dere kunne så mye?",
    "Hele 30 sekunder har gått... bruh...",
    "Bedre lykke neste gang.",
    "Prøvde dere en gang?"
]

const getRandomDissapointedString = () => {
    return disappointedStrings[Math.floor(Math.random()*disappointedStrings.length)]
}

const delay = async (timeout: number) => {
    return await new Promise(r => setTimeout(r, timeout))
}

bot.onText(/(.*)/, async (msg, match) => {
    const quiz = getOrSetQuiz(msg.chat.id)
    if (match?.[0] === "/scores") {
        await scoreboard(msg.chat.id, quiz.scores())
    }

    if (match?.[0] === "/resume") {
        await bot.sendMessage(msg.chat.id, quiz.currentQuestion.question)
        quiz.sentDate = new Date()
    }

    if (match?.[0] === "/start" && msg.from?.username === "FredrikV") {
        quiz.pause = true
        await bot.sendMessage(msg.chat.id, "Er dere klare for en interessant, insane, livsfarlig og original quiz som definitivt ikke er generert av en AI?")
        await new Promise(r => setTimeout(r, 2000))
        await bot.sendMessage(msg.chat.id, "Vi kan garantere at dette ikke er en samling av tilfeldige spørsmål generert av en kraftig datamaskin med tilgang til internett. Absolutt ikke.")
        await new Promise(r => setTimeout(r, 5000))
        await bot.sendMessage(msg.chat.id, "Vi har brukt uker på å nøye håndplukke hvert spørsmål fra gamle leksikoner og støvete faktabøker som ikke en gang bibliotekarer ville plukket opp.")
        await new Promise(r => setTimeout(r, 5000))
        await bot.sendMessage(msg.chat.id, "Regler: \n - Opp til 30 poeng til første person som svarer riktig \n - Mulig poeng synker med 1 per sekund \n - Maks 30 sekunder per spørsmål \n - Vinneren er den med flest poeng etter alle spørsmåla \n - Såkalt googling er oppfordret, for dette blir vanskelig ")
        await new Promise(r => setTimeout(r, 5000))
        await bot.sendMessage(msg.chat.id, "Lykke til... Dere kommer til å trenge det.")
        await new Promise(r => setTimeout(r, 5000))
        await bot.sendMessage(msg.chat.id, "Første spørsmål av " + quiz.questions.length + ": \n\n" + quiz.currentQuestion.question)

        quiz.pause = false
        quiz.sentDate = new Date()

        return
    }

    if (match) {
        const a = quiz.answer(msg.from!.id, match[0])
        if (a) {
            await bot.sendMessage(msg.chat.id, response(a, msg.from!.first_name), {reply_to_message_id: msg.message_id, parse_mode: "HTML"})
            if (quiz.currentIndex < (quiz.questions.length -1)) {
                await new Promise(r => setTimeout(r, 1000))

                if (quiz.currentIndex % 5 === 0) {
                    await bot.sendMessage(msg.chat.id, `Resultater:`)
                    await scoreboard(msg.chat.id, quiz.scores())
                }
                
                await bot.sendMessage(msg.chat.id, `Neste spørsmål...`)
            }

            const nextQuestion = async () => {
                const q = quiz.nextQuestion()
                if (q) {
                    await bot.sendMessage(msg.chat.id, "❔❔❔    ❔❔❔\n\n" + q, {parse_mode: "HTML"})
                    const i = quiz.currentIndex
                    setTimeout(async () => {
                        if (quiz.currentIndex === i) {
                            await bot.sendMessage(msg.chat.id, "🚫🚫🚫🚫🚫🚫\n"+ getRandomDissapointedString())
                            await delay(2000)
                            await bot.sendMessage(msg.chat.id, "Riktig svar: " + quiz.currentQuestion.answer)
                            await delay(2000)
                            await bot.sendMessage(msg.chat.id, "Neste spørsmål...")
                            await delay(2000)
                            quiz.currentIndex++;
                            nextQuestion()
                        }
                    }, 30000)
                } else {
                    await bot.sendMessage(msg.chat.id, "----------------\nDet var siste spørsmål! \n\nGratulerer til vinnerne! \n")
                    await scoreboard(msg.chat.id, quiz.scores())
                }
            }

            setTimeout(nextQuestion, 5000)
        }
    }
})

bot.on("polling_error", (err) => {
    console.log(err)
})