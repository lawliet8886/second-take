package com.secondtake.verticalslice.localization

import android.content.Context
import android.content.res.Configuration
import androidx.annotation.StringRes
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import com.secondtake.verticalslice.domain.LocaleTag
import java.util.Locale

@Composable
fun ProvideInterfaceLanguage(localeTag: LocaleTag, content: @Composable () -> Unit) {
    val base = LocalContext.current
    val localized = remember(base, localeTag) { base.forLocale(localeTag) }
    CompositionLocalProvider(LocalContext provides localized, content = content)
}

@Composable
fun textResource(@StringRes id: Int, vararg args: Any): String =
    LocalContext.current.resources.getString(id, *args)

private fun Context.forLocale(localeTag: LocaleTag): Context {
    val configuration = Configuration(resources.configuration)
    configuration.setLocale(Locale.forLanguageTag(localeTag.value))
    return createConfigurationContext(configuration)
}
