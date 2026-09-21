package com.secondtake.verticalslice

import android.graphics.Bitmap
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.test.platform.app.InstrumentationRegistry
import com.secondtake.verticalslice.domain.BranchPresentation
import com.secondtake.verticalslice.domain.ConnectedComparison
import com.secondtake.verticalslice.domain.LocaleContract
import com.secondtake.verticalslice.domain.LocaleTag
import com.secondtake.verticalslice.localization.ProvideInterfaceLanguage
import com.secondtake.verticalslice.ui.ConnectedComparisonScreen
import com.secondtake.verticalslice.ui.ConnectedUiState
import com.secondtake.verticalslice.ui.theme.SecondTakeTheme
import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/** Component fixtures only; entitlement integration is covered by ConversationForkFlowTest. */
class ComparisonReadingTest {
    @get:Rule val composeRule = createComposeRule()
    private var returned = false

    @Test fun english_observations_are_visible_with_their_quotes() {
        render(false)
        composeRule.onNodeWithText("Alex asks for clarification. This reply does not specify a delivery or a deadline.")
            .performScrollTo().assertIsDisplayed()
        capture("reading-en-a")
        composeRule.onNodeWithText("Alex says the sources can be ready by nine tonight. The scope is the sources — not the whole project.")
            .performScrollTo().assertIsDisplayed()
        capture("reading-en-b")
        checkReturn()
    }

    @Test fun portuguese_offer_reading_is_localized() {
        render(true)
        composeRule.onNodeWithText("Alex pede esclarecimento. Essa resposta não especifica uma entrega nem um prazo.")
            .performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText("Alex oferece terminar as fontes até as nove de hoje. Essa oferta não abrange o projeto inteiro.")
            .performScrollTo().assertIsDisplayed()
        capture("reading-pt-b")
        checkReturn()
    }

    @Test fun narrow_screen_with_double_font_scale_keeps_notes_and_exit_reachable() {
        render(false, 2f)
        composeRule.onNodeWithText("Alex says the sources can be ready by nine tonight. The scope is the sources — not the whole project.")
            .performScrollTo().assertIsDisplayed()
        capture("reading-large-font")
        checkReturn()
    }

    private fun checkReturn() {
        composeRule.onNodeWithTag("comparison_back").performScrollTo().assertIsDisplayed().performClick()
        composeRule.runOnIdle { assertTrue(returned) }
    }

    private fun render(pt: Boolean, fontScale: Float = 1f) {
        val locale = LocaleTag(if (pt) "pt-BR" else "en-US")
        val a = BranchPresentation("a", emptyList(),
            if (pt) "Estou preocupado com o projeto" else "I am worried about the project",
            if (pt) "O que você quer dizer exatamente?" else "What do you mean exactly?")
        val b = BranchPresentation("b", emptyList(),
            if (pt) "Você consegue terminar hoje?" else "Can you finish today?",
            if (pt) "Eu termino as fontes até as nove hoje." else "I can finish the sources by nine tonight.")
        composeRule.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, fontScale)) {
                ProvideInterfaceLanguage(locale) {
                    SecondTakeTheme {
                        Box(Modifier.width(320.dp)) {
                            ConnectedComparisonScreen(ConnectedUiState(
                                localeContract = LocaleContract(locale, locale),
                                comparison = ConnectedComparison(0, a, b), showComparison = true,
                            )) { returned = true }
                        }
                    }
                }
            }
        }
    }

    private fun capture(name: String) {
        composeRule.waitForIdle()
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val bitmap = composeRule.onRoot().captureToImage().asAndroidBitmap()
        val dir = File(instrumentation.targetContext.getExternalFilesDir(null), "comparison-reading-fixtures")
        dir.mkdirs()
        File(dir, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }
}
