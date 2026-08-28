package com.secondtake.verticalslice.data

import com.secondtake.verticalslice.data.remote.SecondTakeApi
import com.secondtake.verticalslice.domain.BackendOutcome
import com.secondtake.verticalslice.domain.LocaleTag
import com.secondtake.verticalslice.domain.SelectionSource
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class RemoteConversationRepositoryTest {
    private lateinit var server: MockWebServer
    private lateinit var repository: RemoteConversationRepository

    @Before fun setUp() {
        server = MockWebServer().also { it.start() }
        repository = RemoteConversationRepository(SecondTakeApi(server.url("/").toString()))
    }

    @After fun tearDown() = server.shutdown()

    @Test fun `session ignores unknown fields and exposes only public facts`() = runTest {
        server.enqueue(json("""{"sessionId":"s1","scenarioId":"alex","locale":"pt-BR","messages":[],"revealedFactIds":["visible"],"activeBranch":"main","hiddenFacts":["must-not-map"],"futureField":42}"""))
        val session = repository.startSession(LocaleTag("pt-BR"))
        assertEquals(setOf("visible"), session.revealedFactIds)
        assertEquals("/v1/sessions", server.takeRequest().path)
    }

    @Test fun `alex reply object maps selection source`() = runTest {
        server.enqueue(json(replyJson("ALEX_REPLY", "GEMINI_SELECTOR")))
        val result = repository.sendTurn("s1", "oi", "client-1") as BackendOutcome.AlexReply
        assertEquals("Tudo bem.", result.message.text)
        assertEquals(SelectionSource.REMOTE, result.selectionSource)
        assertTrue(server.takeRequest().body.readUtf8().contains("client-1"))
    }

    @Test fun `local fallback remains a normal Alex reply`() = runTest {
        server.enqueue(json(replyJson("RECOVERY_FALLBACK", "LOCAL_FALLBACK")))
        val result = repository.sendTurn("s1", "oi", "client-2") as BackendOutcome.AlexReply
        assertEquals(SelectionSource.LOCAL_FALLBACK, result.selectionSource)
    }

    @Test fun `intent lock preserves finite options`() = runTest {
        server.enqueue(json("""{"type":"INTENT_LOCK_REQUIRED","turnId":"t1","options":[{"intent":"ASK_CAPABILITY","label":"Saber se Alex consegue"},{"intent":"REQUEST_COMPLETION","label":"Pedir para Alex fazer"}],"publicState":${sessionJson("t1")}}"""))
        val result = repository.sendTurn("s1", "Você consegue?", "client-3") as BackendOutcome.IntentLockRequired
        assertEquals(listOf("ASK_CAPABILITY", "REQUEST_COMPLETION"), result.options.map { it.intent })
    }

    @Test fun `out of scope accepts string message`() = runTest {
        server.enqueue(json("""{"type":"OUT_OF_SCOPE","turnId":"t2","message":"Fique no cenário.","publicState":${sessionJson()}}"""))
        val result = repository.sendTurn("s1", "capital?", "client-4") as BackendOutcome.OutOfScope
        assertEquals("Fique no cenário.", result.intervention)
    }

    @Test fun `transport recovery accepts string message`() = runTest {
        server.enqueue(json("""{"type":"TRANSPORT_FAILURE","turnId":"t3","message":"Tente outra fala.","publicState":${sessionJson()}}"""))
        val result = repository.sendTurn("s1", "oi", "client-5") as BackendOutcome.TransportRecovery
        assertEquals("Tente outra fala.", result.message)
    }

    @Test fun `pending lock rehydrates after recreation`() = runTest {
        server.enqueue(json(sessionJson("t-lock")))
        val session = repository.getSession("s1")
        assertEquals("t-lock", session.pendingIntentLockTurnId)
        assertEquals(2, session.pendingIntentLockOptions.size)
    }

    private fun json(body: String) = MockResponse().setResponseCode(200).setHeader("Content-Type", "application/json").setBody(body)
    private fun sessionJson(lock: String? = null): String {
        val pending = lock?.let { ""","pendingIntentLock":{"turnId":"$it","options":[{"intent":"ASK_CAPABILITY","label":"Capability"},{"intent":"REQUEST_COMPLETION","label":"Request"}]}""" }.orEmpty()
        return """{"sessionId":"s1","scenarioId":"alex","locale":"pt-BR","messages":[],"revealedFactIds":[],"activeBranch":"main"$pending}"""
    }
    private fun replyJson(type: String, source: String) = """{"type":"$type","turnId":"t1","message":{"id":"m2","role":"ALEX","text":"Tudo bem.","turnId":"t1"},"selectionSource":"$source","publicState":{"sessionId":"s1","scenarioId":"alex","locale":"pt-BR","messages":[{"id":"m1","role":"USER","text":"oi","turnId":"t1"},{"id":"m2","role":"ALEX","text":"Tudo bem.","turnId":"t1"}],"revealedFactIds":[],"activeBranch":"main"}}"""
}
