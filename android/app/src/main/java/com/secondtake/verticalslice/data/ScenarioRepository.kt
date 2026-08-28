package com.secondtake.verticalslice.data

import com.secondtake.verticalslice.domain.Consequence
import com.secondtake.verticalslice.domain.ConversationTurn
import com.secondtake.verticalslice.domain.LocaleTag
import com.secondtake.verticalslice.domain.Persona
import com.secondtake.verticalslice.domain.Scenario
import com.secondtake.verticalslice.domain.ScenarioFact
import com.secondtake.verticalslice.domain.ScenarioScript
import com.secondtake.verticalslice.domain.Speaker
import com.secondtake.verticalslice.domain.UserChoice

object ScenarioRepository {
    val English = LocaleTag("en-US")
    val PortugueseBrazil = LocaleTag("pt-BR")

    fun validatedScenario(): Scenario {
        val persona = Persona(
            id = "alex-teammate",
            version = 1,
            displayName = "Alex",
            role = "teammate",
            traits = listOf("proud", "under-pressure", "not-caricatural", "willing-to-repair"),
        )
        val facts = listOf(
            ScenarioFact("presentation_day", "Friday"),
            ScenarioFact("missing_work", "Two research slides"),
            ScenarioFact("relationship", "Teammates on an important project"),
            ScenarioFact("alex_internship_schedule_changed", "true"),
        )
        return Scenario(
            id = "teammate-missed-project-work",
            version = 1,
            facts = facts,
            persona = persona,
            scripts = mapOf(
                English to englishScript(),
                PortugueseBrazil to portugueseScript(),
            ),
        )
    }

    private fun englishScript(): ScenarioScript {
        val time = "4:21 PM"
        val defensive = ConversationTurn(
            "a-consequence",
            Speaker.ALEX,
            "That’s not fair. I’ve done plenty. If you think you can do it better, just do it yourself.",
            time,
        )
        return ScenarioScript(
            locale = English,
            title = "A teammate isn’t pulling their weight on an important project.",
            summary = "Two slides are late, and the presentation is Friday. You need to talk before the whole team falls further behind.",
            contextSummary = "Presentation on Friday · two research slides still incomplete",
            logicalTimestamp = time,
            preForkTurns = listOf(
                ConversationTurn("alex-open", Speaker.ALEX, "Hey — you wanted to check in about the presentation?", "4:20 PM"),
                ConversationTurn("user-open", Speaker.USER, "Yeah. We need to talk about the research section.", "4:20 PM"),
                ConversationTurn("alex-fork", Speaker.ALEX, "I know the slides aren’t finished yet.", time),
            ),
            choiceA = UserChoice("choice-a", "You never do your part. I’m tired of carrying this whole project."),
            consequenceA = Consequence(
                "consequence-a",
                defensive,
                "Alex defends their character and disengages. The deadline remains unresolved.",
                "The missing work became a judgment about the person, so Alex defends themself instead of discussing the project.",
            ),
            choiceB = UserChoice("choice-b", "We’re behind on the two research slides. I want to understand what’s getting in the way — what happened?"),
            branchBTurns = listOf(
                ConversationTurn("b-alex-context", Speaker.ALEX, "I don’t love being called out like this. But my internship schedule changed and I lost two evenings. I should’ve told you.", time),
                ConversationTurn("b-user-follow", Speaker.USER, "I wish you had. What can you actually get done tonight? And where do you need help?", "4:22 PM"),
                ConversationTurn("b-alex-plan", Speaker.ALEX, "I can get the sources done by nine. I might need help cutting down the analysis tomorrow.", "4:23 PM"),
            ),
            consequenceBSummary = "Alex is still uncomfortable, but explains what happened. Now there’s room to negotiate — no guarantee you’ll agree.",
            consequenceBCausalExplanation = "The response focuses on what is late and asks what happened, leaving room for context and a possible next step.",
        )
    }

    private fun portugueseScript(): ScenarioScript {
        val time = "16:21"
        val defensive = ConversationTurn(
            "a-consequence",
            Speaker.ALEX,
            "Isso não é justo. Eu já fiz um monte de coisa. Se você acha que faria melhor, faz sozinho então.",
            time,
        )
        return ScenarioScript(
            locale = PortugueseBrazil,
            title = "Um colega não está fazendo a parte dele num projeto importante.",
            summary = "Dois slides estão atrasados, e a apresentação é sexta. Você precisa falar com ele antes que o grupo se atrase ainda mais.",
            contextSummary = "Apresentação na sexta · dois slides de pesquisa ainda incompletos",
            logicalTimestamp = time,
            preForkTurns = listOf(
                ConversationTurn("alex-open", Speaker.ALEX, "Oi. Você queria falar comigo sobre a apresentação?", "16:20"),
                ConversationTurn("user-open", Speaker.USER, "Queria. A gente precisa falar da parte de pesquisa.", "16:20"),
                ConversationTurn("alex-fork", Speaker.ALEX, "Eu sei. Os slides ainda não estão prontos.", time),
            ),
            choiceA = UserChoice("choice-a", "Você nunca faz a sua parte. Eu cansei de carregar esse projeto nas costas."),
            consequenceA = Consequence(
                "consequence-a",
                defensive,
                "Alex defende o próprio caráter e se fecha. O prazo continua sem solução.",
                "O atraso virou um ataque à pessoa, então Alex parou de falar do projeto e começou a se defender.",
            ),
            choiceB = UserChoice("choice-b", "A gente está atrasado nos dois slides de pesquisa. Quero entender o que está pegando. O que aconteceu?"),
            branchBTurns = listOf(
                ConversationTurn("b-alex-context", Speaker.ALEX, "Eu não gostei muito de você vir me cobrar assim. Mas meu horário no estágio mudou e eu perdi duas noites. Eu devia ter avisado.", time),
                ConversationTurn("b-user-follow", Speaker.USER, "Devia mesmo. O que você consegue terminar hoje? E no que precisa de ajuda?", "16:22"),
                ConversationTurn("b-alex-plan", Speaker.ALEX, "Consigo fechar as fontes até as nove. Amanhã talvez eu precise de ajuda pra enxugar a análise.", "16:23"),
            ),
            consequenceBSummary = "Alex ainda fica incomodado, mas conta o que aconteceu. Agora dá para negociar — sem garantia de acordo.",
            consequenceBCausalExplanation = "A resposta fala do atraso sem atacar Alex e pergunta o que aconteceu, abrindo espaço para contexto e um próximo passo.",
        )
    }
}
