import { ratio } from "fuzzball"

export class Quiz {
    public questions

    public currentIndex = 0

    public pause = false

    public answered: {
        [key: number]: number
    } = {}

    constructor(questions: Question[]) {
        this.questions = questions
    }

    public get currentQuestion() {
        return this.questions[this.currentIndex]
    }

    answer(uid: number, text: string): boolean {
        if (this.pause || this.answered[this.currentIndex]) {
            return false
        }

        const current = this.questions[this.currentIndex]
        const r = ratio(current.answer, text)
        if (r >= 90) {
            this.pause = true
            this.answered[this.currentIndex] = uid
            return true
        }
        return false
    }

    nextQuestion(): string | null {
        this.currentIndex++
        this.pause = false
        return this.currentQuestion?.question ?? null
    }
    
    scores(): Score[] {
        const scores: Score[] = []

        for (const uid of Object.values(this.answered)) {
            const existing = scores.find(i => i.userId == uid)
            if (existing) {
                existing.score++
            } else {
                scores.push({
                    userId: uid,
                    score: 1,
                })
            }
        }

        return scores.sort((a, b) => b.score - a.score)
    }
}

type Question = {
    question: string
    answer: string
}

type Score = {
    userId: number
    score: number
}