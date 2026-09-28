package com.example.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
  primary = HalagelEmerald,
  secondary = HalagelLightEmerald,
  tertiary = HalagelDarkEmerald,
  background = HalagelDarkBg,
  surface = HalagelDarkSurface,
  surfaceVariant = HalagelDarkCard,
  onPrimary = Color.White,
  onSecondary = Color.White,
  onBackground = Color.White,
  onSurface = Color.White,
  outline = HalagelBorder
)

private val LightColorScheme = lightColorScheme(
  primary = HalagelDarkEmerald,
  secondary = HalagelEmerald,
  tertiary = HalagelLightEmerald,
  background = Color(0xFFF8FAFC),
  surface = Color.White,
  surfaceVariant = Color(0xFFF1F5F9),
  onPrimary = Color.White,
  onSecondary = Color.White,
  onBackground = Color(0xFF0F172A),
  onSurface = Color(0xFF0F172A),
  outline = Color(0xFFCBD5E1)
)

@Composable
fun MyApplicationTheme(
  darkTheme: Boolean = true, // Default to dark theme matching video
  dynamicColor: Boolean = false,
  content: @Composable () -> Unit,
) {
  val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
  MaterialTheme(colorScheme = colorScheme, typography = Typography, content = content)
}
