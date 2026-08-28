package com.secondtake.verticalslice.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Canvas = Color(0xFF090B15)
val Surface = Color(0xFF111426)
val SurfaceRaised = Color(0xFF181B31)
val Ink = Color(0xFFF8F7FF)
val Muted = Color(0xFFA9ABC4)
val MutedDark = Color(0xFF777B98)
val Violet = Color(0xFFA891FF)
val VioletDeep = Color(0xFF332B67)
val Mint = Color(0xFF7DE6BF)
val Coral = Color(0xFFFF8F85)
val Action = Color(0xFFFFD27D)
val Checkpoint = Color(0xFF80C7FF)
val Line = Color(0xFF303552)

private val Colors = darkColorScheme(
    primary = Violet,
    secondary = Mint,
    tertiary = Action,
    background = Canvas,
    surface = Surface,
    surfaceVariant = SurfaceRaised,
    onPrimary = Canvas,
    onSecondary = Canvas,
    onBackground = Ink,
    onSurface = Ink,
    outline = Line,
    error = Coral,
)

@Composable
fun SecondTakeTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = Colors, typography = Typography(), content = content)
}
