package com.secondtake.verticalslice.data.remote

import com.google.gson.Gson
import com.secondtake.verticalslice.domain.ConversationClientError
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.InterruptedIOException
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.util.concurrent.TimeUnit

class SecondTakeApi(
    baseUrl: String,
    private val gson: Gson = Gson(),
    private val client: OkHttpClient = defaultClient(),
) {
    private val baseUrl = baseUrl.trimEnd('/')

    suspend fun health(): Boolean = request<Unit, Map<*, *>>("GET", "/health", null).isNotEmpty()
    suspend fun ready(): Boolean = request<Unit, Map<*, *>>("GET", "/ready", null).isNotEmpty()
    suspend fun createSession(body: CreateSessionRequest): PublicSessionDto = request("POST", "/v1/sessions", body)
    suspend fun getSession(id: String): PublicSessionDto = request<Unit, PublicSessionDto>("GET", "/v1/sessions/$id", null)
    suspend fun sendTurn(id: String, body: TurnRequest): TurnResponseDto = request("POST", "/v1/sessions/$id/turns", body)
    suspend fun confirmIntent(id: String, body: IntentLockRequest): TurnResponseDto = request("POST", "/v1/sessions/$id/intent-lock", body)
    suspend fun rewind(id: String, body: RewindRequest): PublicSessionDto = request("POST", "/v1/sessions/$id/rewind", body)

    private suspend inline fun <reified I, reified O> request(method: String, path: String, body: I?): O = withContext(Dispatchers.IO) {
        val builder = Request.Builder().url("$baseUrl$path").header("Accept", "application/json")
        val requestBody = body?.let { gson.toJson(it).toRequestBody(JSON) }
        when (method) {
            "GET" -> builder.get()
            "POST" -> builder.post(requestBody ?: "{}".toRequestBody(JSON))
            else -> error("Unsupported method")
        }
        try {
            client.newCall(builder.build()).execute().use { response ->
                val text = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    val code = runCatching { gson.fromJson(text, ErrorEnvelopeDto::class.java).error?.code }.getOrNull()
                    if (response.code == 404 && code == "SESSION_NOT_FOUND") throw ConversationClientError.SessionLost
                    throw ConversationClientError.Http(response.code, code)
                }
                try {
                    gson.fromJson(text, O::class.java) ?: throw IllegalStateException("Empty JSON")
                } catch (error: Throwable) {
                    throw ConversationClientError.Decoding(error)
                }
            }
        } catch (error: ConversationClientError) {
            throw error
        } catch (error: SocketTimeoutException) {
            throw ConversationClientError.Timeout(error)
        } catch (error: InterruptedIOException) {
            throw ConversationClientError.Timeout(error)
        } catch (error: ConnectException) {
            throw ConversationClientError.Connection(error)
        } catch (error: Throwable) {
            throw ConversationClientError.Connection(error)
        }
    }

    companion object {
        private val JSON = "application/json; charset=utf-8".toMediaType()
        fun defaultClient(): OkHttpClient = OkHttpClient.Builder()
            .connectTimeout(3, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .writeTimeout(5, TimeUnit.SECONDS)
            .callTimeout(15, TimeUnit.SECONDS)
            .retryOnConnectionFailure(false)
            .build()
    }
}
