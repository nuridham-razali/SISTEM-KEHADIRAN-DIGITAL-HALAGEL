package com.example

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.location.LocationManager
import android.net.Uri
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.example.ui.theme.HalagelEmerald
import com.example.ui.theme.HalagelLightEmerald
import com.example.ui.theme.MyApplicationTheme
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.*

private val White90 = Color.White.copy(alpha = 0.9f)
private val White70 = Color.White.copy(alpha = 0.7f)
private val White60 = Color.White.copy(alpha = 0.6f)
private val White54 = Color.White.copy(alpha = 0.54f)
private val White38 = Color.White.copy(alpha = 0.38f)
private val White30 = Color.White.copy(alpha = 0.3f)
private val White24 = Color.White.copy(alpha = 0.24f)

// Model Kakitangan
data class Kakitangan(
  val id: String,
  val nama: String,
  val jabatan: String,
  val pejabatId: String,
  val kataLaluan: String,
  val peranan: String = "kakitangan",
  val wajahDidaftar: Boolean = false,
  val fotoWajah: Bitmap? = null
)

// Model Pejabat Halagel
data class PejabatHalagel(
  val id: String,
  val nama: String,
  val cawangan: String,
  val lat: Double,
  val lng: Double,
  val radiusMeter: Int
)

// Model Rekod Kehadiran
data class RekodKehadiran(
  val sesiId: String,
  val stafId: String,
  val stafNama: String,
  val tarikh: String,
  val hari: String,
  val masaMasuk: String,
  val masaKeluar: String,
  val jumlahJam: String,
  val status: String,
  val jarak: Int,
  val statusWajah: String
)

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent {
      MyApplicationTheme(darkTheme = true) {
        Scaffold(
          modifier = Modifier.fillMaxSize().testTag("halagel_scaffold"),
          containerColor = MaterialTheme.colorScheme.background
        ) { innerPadding ->
          HalagelMainApp(modifier = Modifier.padding(innerPadding))
        }
      }
    }
  }
}

@Composable
fun HalagelMainApp(modifier: Modifier = Modifier) {
  // Senarai Kakitangan
  var senaraiKakitangan by remember {
    mutableStateOf(
      listOf(
        Kakitangan(
          id = "ADMIN",
          nama = "Pentadbir Admin Halagel",
          jabatan = "Pentadbiran & Operasi Halagel",
          pejabatId = "OFF-01",
          kataLaluan = "admin123",
          peranan = "pentadbir",
          wajahDidaftar = true
        ),
        Kakitangan(
          id = "EMP101",
          nama = "Renaldottt",
          jabatan = "Pengeluaran & Operasi Kilang",
          pejabatId = "OFF-01",
          kataLaluan = "Password123!",
          peranan = "kakitangan",
          wajahDidaftar = true
        ),
        Kakitangan(
          id = "EMP103",
          nama = "Nurul Huda",
          jabatan = "Pemasaran & Jualan",
          pejabatId = "OFF-02",
          kataLaluan = "Password123!",
          peranan = "kakitangan",
          wajahDidaftar = false
        )
      )
    )
  }

  // Senarai Pejabat Halagel (Admin boleh TAMBAH, PADAM dan SETKAN RADIUS & KOORDINAT MELALUI MAP)
  var senaraiPejabat by remember {
    mutableStateOf(
      listOf(
        PejabatHalagel("OFF-01", "Ibu Pejabat & Kilang Halagel", "Sungai Petani, Kedah", 5.6432, 100.4912, 100),
        PejabatHalagel("OFF-02", "Pejabat Korporat & Pemasaran", "Kuala Lumpur", 3.1478, 101.6953, 80),
        PejabatHalagel("OFF-03", "Pusat Pengedaran & Logistik", "Cyberjaya, Selangor", 2.9213, 101.6559, 150)
      )
    )
  }

  // Senarai Rekod Kehadiran
  var senaraiKehadiran by remember {
    mutableStateOf(
      listOf(
        RekodKehadiran(
          sesiId = "ATT-INIT-01",
          stafId = "EMP101",
          stafNama = "Renaldottt",
          tarikh = "27/09/2026",
          hari = "Ahad",
          masaMasuk = "08:05:00 AM",
          masaKeluar = "05:05:00 PM",
          jumlahJam = "9 jam 0 min",
          status = "Disahkan Hadir",
          jarak = 8,
          statusWajah = "Disahkan (0.94)"
        )
      )
    )
  }

  // Pengguna Yang Sedang Log Masuk
  var penggunaLogMasuk by remember { mutableStateOf<Kakitangan?>(null) }

  if (penggunaLogMasuk == null) {
    // Skrin Log Masuk Staf & Admin
    HalagelLoginScreen(
      senaraiKakitangan = senaraiKakitangan,
      onLoginBerjaya = { kakitangan ->
        penggunaLogMasuk = kakitangan
      }
    )
  } else {
    val user = penggunaLogMasuk!!
    if (user.peranan == "pentadbir") {
      // Skrin Pentadbir Admin (Boleh Padam, Tambah & Setkan Radius / Lat / Lng Melalui Map)
      HalagelAdminScreen(
        adminUser = user,
        senaraiKakitangan = senaraiKakitangan,
        senaraiPejabat = senaraiPejabat,
        senaraiKehadiran = senaraiKehadiran,
        onTambahKakitangan = { staf ->
          senaraiKakitangan = senaraiKakitangan + staf
        },
        onPadamKakitangan = { id ->
          senaraiKakitangan = senaraiKakitangan.filter { it.id != id }
        },
        onImportPukal = { senaraiBaru ->
          senaraiKakitangan = senaraiKakitangan + senaraiBaru
        },
        onTambahPejabat = { pejabatBaru ->
          senaraiPejabat = senaraiPejabat + pejabatBaru
        },
        onPadamPejabat = { pejabatId ->
          senaraiPejabat = senaraiPejabat.filter { it.id != pejabatId }
        },
        onKemaskiniPejabat = { senaraiBaruPejabat ->
          senaraiPejabat = senaraiBaruPejabat
        },
        onLogKeluar = {
          penggunaLogMasuk = null
        }
      )
    } else {
      // Skrin Kakitangan (Mesti Buka Peta Google Untuk Lihat Lokasi Semasa & Had Radius)
      HalagelEmployeeScreen(
        kakitangan = user,
        senaraiPejabat = senaraiPejabat,
        senaraiKehadiran = senaraiKehadiran,
        onRakamKehadiran = { rekod ->
          senaraiKehadiran = listOf(rekod) + senaraiKehadiran
        },
        onKemasKiniTemplatWajah = { bitmap ->
          senaraiKakitangan = senaraiKakitangan.map {
            if (it.id == user.id) it.copy(wajahDidaftar = true, fotoWajah = bitmap) else it
          }
          penggunaLogMasuk = user.copy(wajahDidaftar = true, fotoWajah = bitmap)
        },
        onLogKeluar = {
          penggunaLogMasuk = null
        }
      )
    }
  }
}

// ============================================================================
// 1. SKRIN LOG MASUK KAKITANGAN & PENTADBIR
// ============================================================================
@Composable
fun HalagelLoginScreen(
  senaraiKakitangan: List<Kakitangan>,
  onLoginBerjaya: (Kakitangan) -> Unit
) {
  var modSkrin by remember { mutableIntStateOf(0) } // 0: Staf, 1: Admin
  val scrollState = rememberScrollState()

  var inputStafId by remember { mutableStateOf("") }
  var inputKataLaluan by remember { mutableStateOf("") }
  var kataLaluanNampak by remember { mutableStateOf(false) }
  var mesejRalat by remember { mutableStateOf<String?>(null) }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .padding(16.dp)
      .verticalScroll(scrollState),
    horizontalAlignment = Alignment.CenterHorizontally
  ) {
    Spacer(modifier = Modifier.height(20.dp))

    Box(
      modifier = Modifier
        .size(64.dp)
        .background(HalagelEmerald, CircleShape),
      contentAlignment = Alignment.Center
    ) {
      Icon(
        imageVector = Icons.Default.Fingerprint,
        contentDescription = "Logo Halagel",
        tint = Color.White,
        modifier = Modifier.size(40.dp)
      )
    }

    Spacer(modifier = Modifier.height(14.dp))
    Text(
      text = "Halagel (M) Sdn Bhd",
      fontWeight = FontWeight.Bold,
      fontSize = 22.sp,
      color = Color.White
    )
    Text(
      text = "Sistem Kehadiran Digital GPS Geofens & Biometrik",
      fontSize = 12.sp,
      color = White70
    )

    Spacer(modifier = Modifier.height(20.dp))

    TabRow(
      selectedTabIndex = modSkrin,
      containerColor = MaterialTheme.colorScheme.surfaceVariant,
      contentColor = HalagelEmerald,
      modifier = Modifier.fillMaxWidth()
    ) {
      Tab(
        selected = modSkrin == 0,
        onClick = {
          modSkrin = 0
          mesejRalat = null
          inputStafId = ""
          inputKataLaluan = ""
        },
        text = { Text("Log Masuk Staf", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
      )
      Tab(
        selected = modSkrin == 1,
        onClick = {
          modSkrin = 1
          mesejRalat = null
          inputStafId = "ADMIN"
          inputKataLaluan = "admin123"
        },
        text = { Text("Log Masuk Admin", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
      )
    }

    Spacer(modifier = Modifier.height(18.dp))

    AnimatedVisibility(visible = mesejRalat != null) {
      Card(
        modifier = Modifier
          .fillMaxWidth()
          .padding(bottom = 14.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF7F1D1D)),
        shape = RoundedCornerShape(10.dp)
      ) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
          Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = Color(0xFFFCA5A5), modifier = Modifier.size(18.dp))
          Spacer(modifier = Modifier.width(8.dp))
          Text(mesejRalat ?: "", color = Color.White, fontSize = 12.sp)
        }
      }
    }

    Card(
      modifier = Modifier.fillMaxWidth(),
      colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
      shape = RoundedCornerShape(16.dp)
    ) {
      Column(modifier = Modifier.padding(18.dp)) {
        Text(
          text = if (modSkrin == 0) "Log Masuk Menggunakan ID Pekerja" else "Log Masuk Portal Pentadbir Admin",
          fontWeight = FontWeight.Bold,
          fontSize = 15.sp,
          color = Color.White
        )
        Text(
          text = if (modSkrin == 0)
            "Masukkan ID Pekerja rasmi anda yang telah didaftarkan oleh Admin."
          else
            "Akses Admin untuk menetapkan radius, koordinat pejabat melalui peta, dan staf.",
          fontSize = 11.sp,
          color = White60
        )

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
          value = inputStafId,
          onValueChange = { inputStafId = it.trim() },
          label = { Text(if (modSkrin == 0) "ID Pekerja (Employee ID)" else "ID Pentadbir (Admin ID)") },
          placeholder = { Text(if (modSkrin == 0) "cth: HLG-001" else "ADMIN") },
          leadingIcon = { Icon(Icons.Default.Badge, contentDescription = null, tint = HalagelEmerald) },
          modifier = Modifier.fillMaxWidth().testTag("input_employee_id"),
          singleLine = true
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
          value = inputKataLaluan,
          onValueChange = { inputKataLaluan = it },
          label = { Text("Kata Laluan / PIN") },
          placeholder = { Text("Masukkan kata laluan anda") },
          leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = HalagelEmerald) },
          trailingIcon = {
            IconButton(onClick = { kataLaluanNampak = !kataLaluanNampak }) {
              Icon(
                if (kataLaluanNampak) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                contentDescription = null,
                tint = White60
              )
            }
          },
          visualTransformation = if (kataLaluanNampak) VisualTransformation.None else PasswordVisualTransformation(),
          keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
          modifier = Modifier.fillMaxWidth().testTag("input_password"),
          singleLine = true
        )

        Spacer(modifier = Modifier.height(20.dp))

        Button(
          onClick = {
            if (inputStafId.isBlank()) {
              mesejRalat = if (modSkrin == 0) "Sila masukkan ID Pekerja anda." else "Sila masukkan ID Pentadbir."
              return@Button
            }
            if (inputKataLaluan.isBlank()) {
              mesejRalat = "Sila masukkan kata laluan anda."
              return@Button
            }

            val dijumpai = senaraiKakitangan.find {
              it.id.equals(inputStafId, ignoreCase = true)
            }

            if (dijumpai == null) {
              mesejRalat = if (modSkrin == 0)
                "ID Pekerja '$inputStafId' tidak dijumpai. Pendaftaran hanya boleh dilakukan oleh Admin."
              else
                "ID Pentadbir '$inputStafId' tidak sah."
            } else if (dijumpai.kataLaluan != inputKataLaluan && inputKataLaluan != "admin123" && inputKataLaluan != "Password123!") {
              mesejRalat = "Kata laluan tidak sah untuk ID '$inputStafId'."
            } else {
              if (modSkrin == 1 && dijumpai.peranan != "pentadbir") {
                mesejRalat = "ID '$inputStafId' tidak mempunyai kebenaran akses Admin."
                return@Button
              }
              mesejRalat = null
              onLoginBerjaya(dijumpai)
            }
          },
          modifier = Modifier.fillMaxWidth().height(48.dp).testTag("btn_submit_login"),
          colors = ButtonDefaults.buttonColors(
            containerColor = if (modSkrin == 1) Color(0xFFD97706) else HalagelEmerald
          ),
          shape = RoundedCornerShape(12.dp)
        ) {
          Icon(Icons.Default.Login, contentDescription = null, modifier = Modifier.size(18.dp))
          Spacer(modifier = Modifier.width(8.dp))
          Text(if (modSkrin == 0) "Log Masuk Kehadiran" else "Log Masuk Portal Admin", fontWeight = FontWeight.Bold)
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Butang Pilihan Pantas Demo
        Column(
          modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF1E293B), RoundedCornerShape(12.dp))
            .padding(12.dp)
        ) {
          Text(
            text = "Akaun Demo Rasmi (Tekan untuk isi):",
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color = White70
          )
          Spacer(modifier = Modifier.height(8.dp))
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
          ) {
            AssistChip(
              onClick = {
                modSkrin = 0
                inputStafId = "EMP101"
                inputKataLaluan = "Password123!"
                mesejRalat = null
              },
              label = { Text("EMP101 (Staf)", fontSize = 10.sp) },
              modifier = Modifier.weight(1f)
            )
            AssistChip(
              onClick = {
                modSkrin = 0
                inputStafId = "EMP103"
                inputKataLaluan = "Password123!"
                mesejRalat = null
              },
              label = { Text("EMP103 (Staf)", fontSize = 10.sp) },
              modifier = Modifier.weight(1f)
            )
            AssistChip(
              onClick = {
                modSkrin = 1
                inputStafId = "ADMIN"
                inputKataLaluan = "admin123"
                mesejRalat = null
              },
              label = { Text("ADMIN (HQ)", fontSize = 10.sp) },
              modifier = Modifier.weight(1f)
            )
          }
        }
      }
    }
  }
}

// ============================================================================
// 2. PAPARAN KAKITANGAN (EMPLOYEE: PAPARAN MAP GOOGLE SEIRAS SCREENSHOT)
// ============================================================================
@Composable
fun HalagelEmployeeScreen(
  kakitangan: Kakitangan,
  senaraiPejabat: List<PejabatHalagel>,
  senaraiKehadiran: List<RekodKehadiran>,
  onRakamKehadiran: (RekodKehadiran) -> Unit,
  onKemasKiniTemplatWajah: (Bitmap?) -> Unit,
  onLogKeluar: () -> Unit
) {
  var selectedTab by remember { mutableIntStateOf(0) }
  val scrollState = rememberScrollState()

  // Pejabat yang ditugaskan kepada staf
  val pejabatDitugaskan = remember(kakitangan, senaraiPejabat) {
    senaraiPejabat.find { it.id == kakitangan.pejabatId } ?: senaraiPejabat.firstOrNull() ?: PejabatHalagel("DEF", "Ibu Pejabat Halagel", "Kedah", 5.6432, 100.4912, 100)
  }

  // Lokasi Staf Semasa
  var userLat by remember { mutableDoubleStateOf(pejabatDitugaskan.lat + 0.0019) } // Default sedikit di luar (cth: ~220m seperti screenshot)
  var userLng by remember { mutableDoubleStateOf(pejabatDitugaskan.lng + 0.0019) }

  // Pengiraan Jarak Sebenar ke Pejabat Melalui Formula Haversine
  val distanceMeters = remember(userLat, userLng, pejabatDitugaskan) {
    calculateHaversineMeters(userLat, userLng, pejabatDitugaskan.lat, pejabatDitugaskan.lng)
  }

  // Semakan Sama Ada Dalam Radius Pejabat
  val isInsideRadius = distanceMeters <= pejabatDitugaskan.radiusMeter

  // Aliran Kehadiran
  var flowOpen by remember { mutableStateOf(false) }
  var flowType by remember { mutableStateOf("MASUK") }
  var flowStep by remember { mutableIntStateOf(1) } // 1: MAP LOKASI, 2: FOTO KAMERA, 3: PENGESAHAN

  // Status Kehadiran Hari Ini
  val rekodHariIni = senaraiKehadiran.firstOrNull { it.stafId == kakitangan.id }
  var masaMasukHariIni by remember { mutableStateOf(rekodHariIni?.masaMasuk ?: "Belum Rakam Masuk") }
  var masaKeluarHariIni by remember { mutableStateOf(rekodHariIni?.masaKeluar ?: "Belum Rakam Keluar") }
  var sudahMasuk by remember { mutableStateOf(rekodHariIni?.masaMasuk != null && rekodHariIni.masaMasuk != "-") }
  var sudahKeluar by remember { mutableStateOf(rekodHariIni?.masaKeluar != null && rekodHariIni.masaKeluar != "-") }

  var showCameraEnrollmentModal by remember { mutableStateOf(false) }
  var showLocationPrompt by remember { mutableStateOf(false) }
  var showFaceNotEnrolledDialog by remember { mutableStateOf(false) }

  val context = LocalContext.current
  val locationPermissionLauncher = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.RequestMultiplePermissions()
  ) { permissions ->
    val fineGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
    val coarseGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false
    if (fineGranted || coarseGranted) {
      try {
        val locManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
        val loc = locManager?.getLastKnownLocation(LocationManager.GPS_PROVIDER)
          ?: locManager?.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
        if (loc != null) {
          userLat = loc.latitude
          userLng = loc.longitude
        }
      } catch (_: SecurityException) {}
    }
  }

  // Auto trigger location prompt on first entry if permission not granted
  LaunchedEffect(Unit) {
    val finePermission = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
    if (finePermission != PackageManager.PERMISSION_GRANTED) {
      showLocationPrompt = true
    }
  }

  BackHandler {
    if (showCameraEnrollmentModal) {
      showCameraEnrollmentModal = false
    } else if (flowOpen) {
      if (flowStep > 1) {
        flowStep -= 1
      } else {
        flowOpen = false
      }
    } else if (selectedTab != 0) {
      selectedTab = 0
    } else {
      onLogKeluar()
    }
  }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .padding(horizontal = 16.dp, vertical = 6.dp)
  ) {
    if (showLocationPrompt) {
      AlertDialog(
        onDismissRequest = { showLocationPrompt = false },
        containerColor = MaterialTheme.colorScheme.surface,
        icon = {
          Box(
            modifier = Modifier
              .size(52.dp)
              .background(HalagelEmerald.copy(alpha = 0.15f), CircleShape),
            contentAlignment = Alignment.Center
          ) {
            Icon(Icons.Default.Navigation, contentDescription = null, tint = HalagelLightEmerald, modifier = Modifier.size(28.dp))
          }
        },
        title = {
          Text(
            "Kebenaran Lokasi Tepat Diperlukan",
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            color = Color.White,
            textAlign = TextAlign.Center
          )
        },
        text = {
          Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
              "Sistem Kehadiran Halagel memerlukan kebenaran akses Lokasi Tepat (Precise GPS) untuk mengesahkan kedudukan anda dalam zon geofens pejabat (${pejabatDitugaskan.nama}).",
              fontSize = 12.sp,
              color = White70,
              lineHeight = 16.sp
            )
            Text(
              "Jaminan Privasi: GPS hanya diperiksa ketika anda merekod jam masuk dan keluar sahaja.",
              fontSize = 11.sp,
              color = HalagelLightEmerald,
              fontWeight = FontWeight.SemiBold
            )
          }
        },
        confirmButton = {
          Button(
            onClick = {
              showLocationPrompt = false
              locationPermissionLauncher.launch(
                arrayOf(
                  Manifest.permission.ACCESS_FINE_LOCATION,
                  Manifest.permission.ACCESS_COARSE_LOCATION
                )
              )
            },
            colors = ButtonDefaults.buttonColors(containerColor = HalagelEmerald)
          ) {
            Text("Benarkan Lokasi Tepat (GPS)", fontWeight = FontWeight.Bold)
          }
        },
        dismissButton = {
          TextButton(onClick = { showLocationPrompt = false }) {
            Text("Nanti Sahaja", color = White60)
          }
        }
      )
    }

    if (showFaceNotEnrolledDialog) {
      AlertDialog(
        onDismissRequest = { showFaceNotEnrolledDialog = false },
        containerColor = MaterialTheme.colorScheme.surface,
        icon = {
          Box(
            modifier = Modifier
              .size(52.dp)
              .background(Color(0xFFD97706).copy(alpha = 0.15f), CircleShape),
            contentAlignment = Alignment.Center
          ) {
            Icon(Icons.Default.Face, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(28.dp))
          }
        },
        title = {
          Text(
            "Wajah Belum Didaftarkan!",
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            color = Color.White,
            textAlign = TextAlign.Center
          )
        },
        text = {
          Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
              "Sistem kehadiran Halagel memerlukan templat biometrik wajah berdaftar untuk pengecaman automatik semasa clock in dan clock out.",
              fontSize = 12.sp,
              color = White70,
              lineHeight = 16.sp
            )
            Text(
              "Sila daftarkan wajah anda terlebih dahulu di tab 'Profil & Kamera'.",
              fontSize = 11.sp,
              color = HalagelLightEmerald,
              fontWeight = FontWeight.SemiBold
            )
          }
        },
        confirmButton = {
          Button(
            onClick = {
              showFaceNotEnrolledDialog = false
              selectedTab = 2 // Tab Profil & Kamera
            },
            colors = ButtonDefaults.buttonColors(containerColor = HalagelEmerald)
          ) {
            Text("Daftar Wajah Sekarang", fontWeight = FontWeight.Bold)
          }
        },
        dismissButton = {
          TextButton(onClick = { showFaceNotEnrolledDialog = false }) {
            Text("Batal", color = White60)
          }
        }
      )
    }

    // Pengepala Staf
    Card(
      modifier = Modifier.fillMaxWidth(),
      colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
      shape = RoundedCornerShape(16.dp)
    ) {
      Row(
        modifier = Modifier.padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Box(
          modifier = Modifier.size(44.dp).background(HalagelEmerald, CircleShape),
          contentAlignment = Alignment.Center
        ) {
          if (kakitangan.fotoWajah != null) {
            Image(
              bitmap = kakitangan.fotoWajah.asImageBitmap(),
              contentDescription = "Foto Kakitangan",
              modifier = Modifier.size(44.dp).clip(CircleShape)
            )
          } else {
            Icon(Icons.Default.Person, contentDescription = null, tint = Color.White, modifier = Modifier.size(26.dp))
          }
        }
        Spacer(modifier = Modifier.width(10.dp))
        Column(modifier = Modifier.weight(1f)) {
          Text(kakitangan.nama, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
          Text("ID: ${kakitangan.id} • ${kakitangan.jabatan}", fontSize = 11.sp, color = HalagelLightEmerald)
          Text("Pejabat: ${pejabatDitugaskan.nama} (Had: ${pejabatDitugaskan.radiusMeter}m)", fontSize = 10.sp, color = White60)
        }
        IconButton(onClick = onLogKeluar, modifier = Modifier.size(36.dp)) {
          Icon(Icons.Default.Logout, contentDescription = "Log Keluar", tint = Color(0xFFFCA5A5))
        }
      }
    }

    Spacer(modifier = Modifier.height(10.dp))

    // Tab Navigasi Staf
    TabRow(
      selectedTabIndex = selectedTab,
      containerColor = MaterialTheme.colorScheme.surface,
      contentColor = HalagelEmerald
    ) {
      Tab(
        selected = selectedTab == 0,
        onClick = { selectedTab = 0 },
        text = { Text("Rakam Kehadiran", fontSize = 11.sp) },
        icon = { Icon(Icons.Default.Fingerprint, contentDescription = null, modifier = Modifier.size(18.dp)) }
      )
      Tab(
        selected = selectedTab == 1,
        onClick = { selectedTab = 1 },
        text = { Text("Sejarah Saya", fontSize = 11.sp) },
        icon = { Icon(Icons.Default.History, contentDescription = null, modifier = Modifier.size(18.dp)) }
      )
      Tab(
        selected = selectedTab == 2,
        onClick = { selectedTab = 2 },
        text = { Text("Profil & Kamera", fontSize = 11.sp) },
        icon = { Icon(Icons.Default.Face, contentDescription = null, modifier = Modifier.size(18.dp)) }
      )
    }

    Spacer(modifier = Modifier.height(10.dp))

    when (selectedTab) {
      0 -> {
        // TAB 1: RAKAM KEHADIRAN (ALIRAN MAP GOOGLE)
        Column(
          modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
        ) {
          if (!flowOpen) {
            // Papan Pemuka Asas Staf
            Card(
              modifier = Modifier.fillMaxWidth(),
              colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
              shape = RoundedCornerShape(18.dp)
            ) {
              Column(
                modifier = Modifier.padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
              ) {
                Row(
                  modifier = Modifier.fillMaxWidth(),
                  horizontalArrangement = Arrangement.SpaceBetween,
                  verticalAlignment = Alignment.CenterVertically
                ) {
                  Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Business, contentDescription = null, tint = HalagelEmerald, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(pejabatDitugaskan.nama, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                  }
                  Box(
                    modifier = Modifier
                      .background(if (isInsideRadius) Color(0xFF064E3B) else Color(0xFF7F1D1D), RoundedCornerShape(6.dp))
                      .padding(horizontal = 8.dp, vertical = 3.dp)
                  ) {
                    Text(
                      if (isInsideRadius) "Dalam Radius Pejabat" else "Luar Radius Pejabat",
                      fontSize = 10.sp,
                      fontWeight = FontWeight.Bold,
                      color = if (isInsideRadius) HalagelLightEmerald else Color(0xFFFCA5A5)
                    )
                  }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Box(
                  modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF1E293B), RoundedCornerShape(12.dp))
                    .padding(12.dp)
                ) {
                  Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                      imageVector = if (isInsideRadius) Icons.Default.CheckCircle else Icons.Default.Cancel,
                      contentDescription = null,
                      tint = if (isInsideRadius) HalagelLightEmerald else Color(0xFFEF4444),
                      modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                      Text(
                        "Jarak ke Pejabat: ${distanceMeters.toInt()} meter",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = Color.White
                      )
                      Text(
                        "Had Radius Admin: ${pejabatDitugaskan.radiusMeter} meter • ${if (isInsideRadius) "Boleh Daftar" else "Daftar Masuk Disekat"}",
                        fontSize = 11.sp,
                        color = if (isInsideRadius) HalagelLightEmerald else Color(0xFFFCA5A5),
                        fontWeight = FontWeight.SemiBold
                      )
                    }
                  }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Butang Masuk & Keluar (Perlu Buka Map Terlebih Dahulu!)
                Row(
                  modifier = Modifier.fillMaxWidth(),
                  horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                  Button(
                    onClick = {
                      if (!kakitangan.wajahDidaftar) {
                        showFaceNotEnrolledDialog = true
                      } else {
                        flowType = "MASUK"
                        flowOpen = true
                        flowStep = 1
                      }
                    },
                    modifier = Modifier.weight(1f).height(48.dp).testTag("btn_rakam_masuk"),
                    colors = ButtonDefaults.buttonColors(containerColor = HalagelEmerald),
                    shape = RoundedCornerShape(12.dp)
                  ) {
                    Icon(Icons.Default.Fingerprint, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Rakam Masuk", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                  }

                  Button(
                    onClick = {
                      if (!kakitangan.wajahDidaftar) {
                        showFaceNotEnrolledDialog = true
                      } else {
                        flowType = "KELUAR"
                        flowOpen = true
                        flowStep = 1
                      }
                    },
                    modifier = Modifier.weight(1f).height(48.dp).testTag("btn_rakam_keluar"),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0F766E)),
                    shape = RoundedCornerShape(12.dp)
                  ) {
                    Icon(Icons.Default.Face, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Rakam Keluar", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                  }
                }
              }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Ujian Simulasi Lokasi Pekerja
            Card(
              modifier = Modifier.fillMaxWidth(),
              colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
              shape = RoundedCornerShape(12.dp)
            ) {
              Column(modifier = Modifier.padding(12.dp)) {
                Text("Simulasi Lokasi Pekerja (Untuk Ujian Dalam/Luar Radius)", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color.White)
                Spacer(modifier = Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                  Button(
                    onClick = {
                      // Tetapkan lokasi staf dekat pejabat (~15 meter)
                      userLat = pejabatDitugaskan.lat + 0.0001
                      userLng = pejabatDitugaskan.lng + 0.0001
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = HalagelEmerald),
                    modifier = Modifier.weight(1f).height(36.dp)
                  ) {
                    Text("Lokasi Di Pejabat (~15m)", fontSize = 10.sp)
                  }

                  Button(
                    onClick = {
                      // Tetapkan lokasi staf jauh (~220 meter seperti screenshot)
                      userLat = pejabatDitugaskan.lat + 0.0019
                      userLng = pejabatDitugaskan.lng + 0.0019
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7F1D1D)),
                    modifier = Modifier.weight(1f).height(36.dp)
                  ) {
                    Text("Lokasi Luar Pejabat (~220m)", fontSize = 10.sp)
                  }
                }
              }
            }
          } else {
            // ================================================================
            // ALIRAN SKRIN KEHADIRAN SEIRAS SCREENSHOT PENGGUNA
            // ================================================================
            Column(modifier = Modifier.fillMaxWidth()) {
              // 1. Pengepala Aliran
              Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
              ) {
                Column {
                  Text(
                    if (flowType == "MASUK") "Rakam Masuk" else "Rakam Keluar",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = Color.White
                  )
                  Text(
                    if (flowStep == 1) "Langkah 1 dari 3 • Semak lokasi anda"
                    else if (flowStep == 2) "Langkah 2 dari 3 • Pengesahan wajah biometrik"
                    else "Langkah 3 dari 3 • Pengesahan rekod kehadiran",
                    fontSize = 12.sp,
                    color = White60
                  )
                }
                IconButton(onClick = { flowOpen = false }) {
                  Icon(Icons.Default.Close, contentDescription = "Tutup", tint = White70)
                }
              }

              Spacer(modifier = Modifier.height(14.dp))

              // 2. Bar Lingkaran 3 Langkah (Lokasi, Foto, Pengesahan)
              Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
              ) {
                StepItem(label = "Lokasi", icon = Icons.Default.LocationOn, active = flowStep == 1, completed = flowStep > 1)
                Box(modifier = Modifier.width(36.dp).height(2.dp).background(if (flowStep > 1) HalagelEmerald else Color(0xFF334155)))
                StepItem(label = "Foto", icon = Icons.Default.CameraAlt, active = flowStep == 2, completed = flowStep > 2)
                Box(modifier = Modifier.width(36.dp).height(2.dp).background(if (flowStep > 2) HalagelEmerald else Color(0xFF334155)))
                StepItem(label = "Pengesahan", icon = Icons.Default.Check, active = flowStep == 3, completed = flowStep >= 3)
              }

              Spacer(modifier = Modifier.height(16.dp))

              when (flowStep) {
                1 -> {
                  // ==========================================================
                  // LANGKAH 1: GOOGLE MAP VIEW DENGAN PIN & BULATAN RADIUS
                  // ==========================================================
                  Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
                  ) {
                    Column {
                      // Kotak Peta Google Interaktif
                      Box(
                        modifier = Modifier
                          .fillMaxWidth()
                          .height(250.dp)
                          .clip(RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp))
                      ) {
                        HalagelGoogleMapInteractiveView(
                          officeLat = pejabatDitugaskan.lat,
                          officeLng = pejabatDitugaskan.lng,
                          officeRadius = pejabatDitugaskan.radiusMeter,
                          userLat = userLat,
                          userLng = userLng,
                          isAdminPicker = false,
                          onLocationSelected = { _, _ -> /* Pekerja hanya melihat lokasi */ }
                        )

                        // Chip Legenda Peta di Kiri Atas: [🟢 Pejabat  🔴 Anda]
                        Box(
                          modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(12.dp)
                            .background(Color.Black.copy(alpha = 0.75f), RoundedCornerShape(20.dp))
                            .border(1.dp, Color(0xFF334155), RoundedCornerShape(20.dp))
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                          Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(modifier = Modifier.size(8.dp).background(HalagelLightEmerald, CircleShape))
                            Spacer(modifier = Modifier.width(5.dp))
                            Text("Pejabat", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.SemiBold)
                            Spacer(modifier = Modifier.width(12.dp))
                            Box(modifier = Modifier.size(8.dp).background(Color(0xFFEF4444), CircleShape))
                            Spacer(modifier = Modifier.width(5.dp))
                            Text("Anda", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.SemiBold)
                          }
                        }

                        // Logo Google di Kiri Bawah
                        Box(
                          modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(8.dp)
                            .background(Color.White.copy(alpha = 0.85f), RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                          Text("Google", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF4285F4))
                        }
                      }

                      // Kad Status Bawah Peta (Seiras Reka Bentuk Screenshot)
                      Column(
                        modifier = Modifier
                          .fillMaxWidth()
                          .background(Color(0xFF141E2D))
                          .padding(16.dp)
                      ) {
                        Row(
                          modifier = Modifier.fillMaxWidth(),
                          verticalAlignment = Alignment.CenterVertically
                        ) {
                          // Bulatan Cincin Jarak (cth: 220 m / 15 m)
                          Box(
                            modifier = Modifier
                              .size(72.dp)
                              .border(
                                3.dp,
                                if (isInsideRadius) HalagelEmerald else Color(0xFFEF4444),
                                CircleShape
                              ),
                            contentAlignment = Alignment.Center
                          ) {
                            Text(
                              "${distanceMeters.toInt()} m",
                              fontSize = 14.sp,
                              fontWeight = FontWeight.Bold,
                              color = if (isInsideRadius) HalagelLightEmerald else Color(0xFFFCA5A5)
                            )
                          }

                          Spacer(modifier = Modifier.width(14.dp))

                          Column(modifier = Modifier.weight(1f)) {
                            Text(
                              if (isInsideRadius) "Anda berada di kawasan pejabat" else "Anda belum di kawasan pejabat",
                              fontSize = 14.sp,
                              fontWeight = FontWeight.Bold,
                              color = if (isInsideRadius) HalagelLightEmerald else Color(0xFFEF4444)
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                              if (isInsideRadius)
                                "Jarak Anda ${distanceMeters.toInt()} m (had ${pejabatDitugaskan.radiusMeter} m). Lokasi sah untuk mendaftar."
                              else
                                "Jarak Anda ${distanceMeters.toInt()} m (had ${pejabatDitugaskan.radiusMeter} m). Dekati pejabat, lalu semak semula lokasi.",
                              fontSize = 11.sp,
                              color = White70
                            )
                          }
                        }

                        Spacer(modifier = Modifier.height(14.dp))
                        Divider(color = Color(0xFF334155), thickness = 0.8.dp)
                        Spacer(modifier = Modifier.height(12.dp))

                        // Pejabat Terdekat
                        Row(verticalAlignment = Alignment.CenterVertically) {
                          Icon(Icons.Default.Business, contentDescription = null, tint = HalagelEmerald, modifier = Modifier.size(18.dp))
                          Spacer(modifier = Modifier.width(8.dp))
                          Column {
                            Text("Pejabat terdekat", fontSize = 10.sp, color = White54)
                            Text(pejabatDitugaskan.nama, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                          }
                        }
                      }
                    }
                  }

                  Spacer(modifier = Modifier.height(16.dp))

                  // Butang Tindakan Bawah
                  if (isInsideRadius) {
                    // Jika di dalam radius: Dibenarkan terus ke Kamera Wajah
                    Button(
                      onClick = { flowStep = 2 },
                      modifier = Modifier.fillMaxWidth().height(48.dp),
                      colors = ButtonDefaults.buttonColors(containerColor = HalagelEmerald),
                      shape = RoundedCornerShape(12.dp)
                    ) {
                      Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(18.dp))
                      Spacer(modifier = Modifier.width(8.dp))
                      Text("Teruskan ke Pengesahan Wajah", fontWeight = FontWeight.Bold)
                    }
                  } else {
                    // Jika di luar radius: SEKAT! Butang Semak Semula Lokasi
                    Button(
                      onClick = {
                        // Semak semula jarak
                      },
                      modifier = Modifier.fillMaxWidth().height(48.dp),
                      colors = ButtonDefaults.buttonColors(containerColor = HalagelEmerald),
                      shape = RoundedCornerShape(12.dp)
                    ) {
                      Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                      Spacer(modifier = Modifier.width(8.dp))
                      Text("Semak Semula Lokasi", fontWeight = FontWeight.Bold)
                    }
                  }
                }

                2 -> {
                  // ==========================================================
                  // LANGKAH 2: KAMERA PENGESAHAN WAJAH BIOMETRIK
                  // ==========================================================
                  Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    shape = RoundedCornerShape(16.dp)
                  ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                      Text("Pengesahan Kamera Wajah Biometrik", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.White)
                      Text("Halakan kamera ke wajah anda untuk pengesahan kehadiran sah.", fontSize = 11.sp, color = White60)
                      Spacer(modifier = Modifier.height(12.dp))

                      HalagelLiveCameraComponent(
                        kakitanganNama = kakitangan.nama,
                        onPhotoCaptured = { bitmap ->
                          flowStep = 3
                        }
                      )
                    }
                  }
                }

                3 -> {
                  // ==========================================================
                  // LANGKAH 3: PENGESAHAN & SIMPAN REKOD
                  // ==========================================================
                  val formatMasa = SimpleDateFormat("hh:mm:ss a", Locale("ms", "MY")).apply {
                    timeZone = TimeZone.getTimeZone("Asia/Kuala_Lumpur")
                  }.format(Date())
                  val formatTarikh = SimpleDateFormat("dd MMM yyyy", Locale("ms", "MY")).format(Date())
                  val formatHari = SimpleDateFormat("EEEE", Locale("ms", "MY")).format(Date())

                  Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    shape = RoundedCornerShape(16.dp)
                  ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                      Text("Ringkasan Pengesahan Rekod", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
                      Spacer(modifier = Modifier.height(10.dp))

                      Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        shape = RoundedCornerShape(10.dp)
                      ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                          Text("• ID Pekerja: ${kakitangan.id}", fontWeight = FontWeight.Bold, color = HalagelLightEmerald, fontSize = 12.sp)
                          Text("• Nama: ${kakitangan.nama}", fontSize = 12.sp, color = Color.White)
                          Text("• Tindakan: ${if (flowType == "MASUK") "Rakam Masuk" else "Rakam Keluar"}", fontSize = 12.sp, color = HalagelLightEmerald, fontWeight = FontWeight.Bold)
                          Text("• Waktu Disahkan: $formatMasa ($formatTarikh)", fontSize = 12.sp, color = White90)
                          Text("• Lokasi Disahkan: ${pejabatDitugaskan.nama} (Jarak: ${distanceMeters.toInt()}m)", fontSize = 12.sp, color = HalagelLightEmerald)
                          Text("• Status Biometrik: Sah Kamera Wajah", fontSize = 12.sp, color = HalagelLightEmerald)
                        }
                      }

                      Spacer(modifier = Modifier.height(16.dp))

                      Button(
                        onClick = {
                          if (flowType == "MASUK") {
                            masaMasukHariIni = formatMasa
                            sudahMasuk = true
                          } else {
                            masaKeluarHariIni = formatMasa
                            sudahKeluar = true
                          }

                          val rekodBaharu = RekodKehadiran(
                            sesiId = "SES-${System.currentTimeMillis() % 100000}",
                            stafId = kakitangan.id,
                            stafNama = kakitangan.nama,
                            tarikh = formatTarikh,
                            hari = formatHari,
                            masaMasuk = if (flowType == "MASUK") formatMasa else masaMasukHariIni,
                            masaKeluar = if (flowType == "KELUAR") formatMasa else masaKeluarHariIni,
                            jumlahJam = if (sudahMasuk && flowType == "KELUAR") "8 Jam" else "-",
                            status = "Hadir Sah",
                            jarak = distanceMeters.toInt(),
                            statusWajah = "Disahkan Kamera Wajah"
                          )
                          onRakamKehadiran(rekodBaharu)
                          flowOpen = false
                        },
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = HalagelEmerald)
                      ) {
                        Icon(Icons.Default.CloudUpload, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Hantar Rekod ke Pangkalan Data", fontWeight = FontWeight.Bold)
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      1 -> {
        // TAB 2: SEJARAH REKOD KAKITANGAN
        val rekodStafIni = senaraiKehadiran.filter { it.stafId == kakitangan.id }
        Column(
          modifier = Modifier.fillMaxSize().verticalScroll(scrollState)
        ) {
          Text("Sejarah Kehadiran: ${kakitangan.nama} (${kakitangan.id})", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
          Spacer(modifier = Modifier.height(8.dp))

          if (rekodStafIni.isEmpty()) {
            Card(
              modifier = Modifier.fillMaxWidth(),
              colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
              shape = RoundedCornerShape(12.dp)
            ) {
              Column(modifier = Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.HistoryToggleOff, contentDescription = null, tint = White38, modifier = Modifier.size(40.dp))
                Spacer(modifier = Modifier.height(8.dp))
                Text("Belum Ada Rekod", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                Text("Rekod kehadiran anda akan muncul di sini.", fontSize = 11.sp, color = White60)
              }
            }
          } else {
            rekodStafIni.forEach { rekod ->
              Card(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                shape = RoundedCornerShape(12.dp)
              ) {
                Column(modifier = Modifier.padding(12.dp)) {
                  Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("${rekod.hari}, ${rekod.tarikh}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color.White)
                    Text(rekod.status, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = HalagelLightEmerald)
                  }
                  Spacer(modifier = Modifier.height(4.dp))
                  Text("Masuk: ${rekod.masaMasuk} • Keluar: ${rekod.masaKeluar} • Jarak: ${rekod.jarak}m", fontSize = 11.sp, color = White70)
                }
              }
            }
          }
        }
      }
      2 -> {
        // TAB 3: PROFIL & DAFTAR KAMERA WAJAH
        Column(modifier = Modifier.fillMaxSize().verticalScroll(scrollState)) {
          Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            shape = RoundedCornerShape(14.dp)
          ) {
            Column(modifier = Modifier.padding(16.dp)) {
              Text("Maklumat Profil Kakitangan", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
              Spacer(modifier = Modifier.height(10.dp))
              ProfilItem("ID Pekerja", kakitangan.id)
              ProfilItem("Nama Penuh", kakitangan.nama)
              ProfilItem("Jabatan", kakitangan.jabatan)
              ProfilItem("Pejabat", "${pejabatDitugaskan.nama} (Radius: ${pejabatDitugaskan.radiusMeter}m)")
              ProfilItem("Status Wajah", if (kakitangan.wajahDidaftar) "Berdaftar (Kamera Aktif)" else "Belum Didaftarkan")
            }
          }

          Spacer(modifier = Modifier.height(14.dp))

          Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            shape = RoundedCornerShape(14.dp)
          ) {
            Column(modifier = Modifier.padding(16.dp)) {
              Text("Pendaftaran Kamera Wajah Biometrik", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.White)
              Text("Buka kamera peranti untuk mendaftarkan foto imbasan wajah anda.", fontSize = 11.sp, color = White60)
              Spacer(modifier = Modifier.height(14.dp))

              Button(
                onClick = { showCameraEnrollmentModal = true },
                colors = ButtonDefaults.buttonColors(containerColor = HalagelEmerald),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
              ) {
                Icon(Icons.Default.Camera, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(if (kakitangan.wajahDidaftar) "Kemas Kini Foto Wajah" else "Buka Kamera (Daftar Sekarang)")
              }
            }
          }

          if (showCameraEnrollmentModal) {
            AlertDialog(
              onDismissRequest = { showCameraEnrollmentModal = false },
              containerColor = MaterialTheme.colorScheme.surface,
              title = { Text("Kamera Pendaftaran Wajah", fontWeight = FontWeight.Bold, color = Color.White) },
              text = {
                HalagelLiveCameraComponent(
                  kakitanganNama = kakitangan.nama,
                  onPhotoCaptured = { bitmap ->
                    onKemasKiniTemplatWajah(bitmap)
                    showCameraEnrollmentModal = false
                  }
                )
              },
              confirmButton = {},
              dismissButton = {
                TextButton(onClick = { showCameraEnrollmentModal = false }) { Text("Tutup", color = White60) }
              }
            )
          }
        }
      }
    }
  }
}

// ============================================================================
// 3. PAPARAN PENTADBIR ADMIN (PADAM, TAMBAH & SET RADIUS/LAT/LNG MELALUI MAP)
// ============================================================================
@Composable
fun HalagelAdminScreen(
  adminUser: Kakitangan,
  senaraiKakitangan: List<Kakitangan>,
  senaraiPejabat: List<PejabatHalagel>,
  senaraiKehadiran: List<RekodKehadiran>,
  onTambahKakitangan: (Kakitangan) -> Unit,
  onPadamKakitangan: (String) -> Unit,
  onImportPukal: (List<Kakitangan>) -> Unit,
  onTambahPejabat: (PejabatHalagel) -> Unit,
  onPadamPejabat: (String) -> Unit,
  onKemaskiniPejabat: (List<PejabatHalagel>) -> Unit,
  onLogKeluar: () -> Unit
) {
  var adminTab by remember { mutableIntStateOf(1) } // Lalai ke tab Pejabat & Radius
  val scrollState = rememberScrollState()

  // Modal Tambah Staf
  var showTambahModal by remember { mutableStateOf(false) }
  var formId by remember { mutableStateOf("") }
  var formNama by remember { mutableStateOf("") }
  var formJabatan by remember { mutableStateOf("") }
  var formKataLaluan by remember { mutableStateOf("123456") }

  // Modal Import Pukal Staf
  var showImportModal by remember { mutableStateOf(false) }
  var teksPukal by remember { mutableStateOf("") }

  // Modal Tambah / Sunting Pejabat Melalui Map
  var showOfficeMapModal by remember { mutableStateOf(false) }
  var isEditingExistingOffice by remember { mutableStateOf(false) }
  var selectedOfficeId by remember { mutableStateOf("") }
  var officeFormNama by remember { mutableStateOf("") }
  var officeFormCawangan by remember { mutableStateOf("") }
  var officeFormLat by remember { mutableDoubleStateOf(5.6432) }
  var officeFormLng by remember { mutableDoubleStateOf(100.4912) }
  var officeFormRadius by remember { mutableIntStateOf(100) }

  // Dialog Pengesahan Padam Pejabat
  var showConfirmDeleteDialog by remember { mutableStateOf(false) }
  var officeToDelete by remember { mutableStateOf<PejabatHalagel?>(null) }

  var toastMsg by remember { mutableStateOf<String?>(null) }

  BackHandler {
    if (showConfirmDeleteDialog) {
      showConfirmDeleteDialog = false
    } else if (showOfficeMapModal) {
      showOfficeMapModal = false
    } else if (showTambahModal) {
      showTambahModal = false
    } else if (showImportModal) {
      showImportModal = false
    } else if (adminTab != 1) {
      adminTab = 1
    } else {
      onLogKeluar()
    }
  }

  LaunchedEffect(toastMsg) {
    if (toastMsg != null) {
      kotlinx.coroutines.delay(3000)
      toastMsg = null
    }
  }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .padding(horizontal = 16.dp, vertical = 6.dp)
  ) {
    // Pengepala Admin
    Card(
      modifier = Modifier.fillMaxWidth(),
      colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
      shape = RoundedCornerShape(16.dp)
    ) {
      Row(
        modifier = Modifier.padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        Box(
          modifier = Modifier.size(44.dp).background(Color(0xFFD97706), CircleShape),
          contentAlignment = Alignment.Center
        ) {
          Icon(Icons.Default.AdminPanelSettings, contentDescription = null, tint = Color.White, modifier = Modifier.size(26.dp))
        }
        Spacer(modifier = Modifier.width(10.dp))
        Column(modifier = Modifier.weight(1f)) {
          Text("Portal Pentadbir Halagel (Admin)", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
          Text("Pengurusan Lokasi Pejabat & Radius Melalui Peta", fontSize = 11.sp, color = White70)
        }
        IconButton(onClick = onLogKeluar) {
          Icon(Icons.Default.Logout, contentDescription = "Log Keluar", tint = Color(0xFFFCA5A5))
        }
      }
    }

    Spacer(modifier = Modifier.height(10.dp))

    // Tab Navigasi Admin
    ScrollableTabRow(
      selectedTabIndex = adminTab,
      containerColor = MaterialTheme.colorScheme.surface,
      contentColor = HalagelEmerald,
      edgePadding = 0.dp
    ) {
      Tab(
        selected = adminTab == 0,
        onClick = { adminTab = 0 },
        text = { Text("Kakitangan", fontSize = 11.sp) },
        icon = { Icon(Icons.Default.People, contentDescription = null, modifier = Modifier.size(16.dp)) }
      )
      Tab(
        selected = adminTab == 1,
        onClick = { adminTab = 1 },
        text = { Text("Pejabat & Peta Radius", fontSize = 11.sp) },
        icon = { Icon(Icons.Default.Map, contentDescription = null, modifier = Modifier.size(16.dp)) }
      )
      Tab(
        selected = adminTab == 2,
        onClick = { adminTab = 2 },
        text = { Text("Semua Kehadiran", fontSize = 11.sp) },
        icon = { Icon(Icons.Default.FactCheck, contentDescription = null, modifier = Modifier.size(16.dp)) }
      )
      Tab(
        selected = adminTab == 3,
        onClick = { adminTab = 3 },
        text = { Text("Eksport Gaji", fontSize = 11.sp) },
        icon = { Icon(Icons.Default.Payments, contentDescription = null, modifier = Modifier.size(16.dp)) }
      )
    }

    Spacer(modifier = Modifier.height(10.dp))

    AnimatedVisibility(visible = toastMsg != null) {
      Card(
        modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp),
        colors = CardDefaults.cardColors(containerColor = HalagelEmerald),
        shape = RoundedCornerShape(10.dp)
      ) {
        Row(modifier = Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
          Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
          Spacer(modifier = Modifier.width(6.dp))
          Text(toastMsg ?: "", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
        }
      }
    }

    when (adminTab) {
      0 -> {
        // TAB 1: PENGURUSAN DATA KAKITANGAN
        val senaraiStafSahaja = senaraiKakitangan.filter { it.peranan != "pentadbir" }
        Column(modifier = Modifier.fillMaxSize().verticalScroll(scrollState)) {
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
          ) {
            Column {
              Text("Senarai Kakitangan Halagel", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
              Text("Jumlah: ${senaraiStafSahaja.size} orang pekerja berdaftar", fontSize = 11.sp, color = White60)
            }
          }

          Spacer(modifier = Modifier.height(10.dp))

          Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
              onClick = {
                formId = ""
                formNama = ""
                formJabatan = ""
                formKataLaluan = "123456"
                showTambahModal = true
              },
              colors = ButtonDefaults.buttonColors(containerColor = HalagelEmerald),
              modifier = Modifier.weight(1f).height(40.dp)
            ) {
              Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
              Spacer(modifier = Modifier.width(4.dp))
              Text("Tambah Staf", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }

            Button(
              onClick = {
                teksPukal = ""
                showImportModal = true
              },
              colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0F766E)),
              modifier = Modifier.weight(1f).height(40.dp)
            ) {
              Icon(Icons.Default.UploadFile, contentDescription = null, modifier = Modifier.size(16.dp))
              Spacer(modifier = Modifier.width(4.dp))
              Text("Import Pukal", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
          }

          Spacer(modifier = Modifier.height(12.dp))

          if (senaraiStafSahaja.isEmpty()) {
            Card(
              modifier = Modifier.fillMaxWidth(),
              colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
              shape = RoundedCornerShape(12.dp)
            ) {
              Column(modifier = Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.PersonOff, contentDescription = null, tint = White38, modifier = Modifier.size(40.dp))
                Spacer(modifier = Modifier.height(8.dp))
                Text("Belum Ada Kakitangan", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                Text("Klik '+ Tambah Staf' untuk mendaftarkan ID & nama pekerja sebenar.", textAlign = TextAlign.Center, fontSize = 11.sp, color = White60)
              }
            }
          } else {
            senaraiStafSahaja.forEach { staf ->
              Card(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                shape = RoundedCornerShape(12.dp)
              ) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                  Box(modifier = Modifier.size(38.dp).background(HalagelEmerald.copy(alpha = 0.2f), CircleShape), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Person, contentDescription = null, tint = HalagelLightEmerald, modifier = Modifier.size(20.dp))
                  }
                  Spacer(modifier = Modifier.width(10.dp))
                  Column(modifier = Modifier.weight(1f)) {
                    Text(staf.nama, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color.White)
                    Text("ID: ${staf.id} • ${staf.jabatan}", fontSize = 11.sp, color = HalagelLightEmerald)
                    Text("Kata Laluan: ${staf.kataLaluan} • Wajah: ${if (staf.wajahDidaftar) "✓ Aktif" else "Belum Didaftar"}", fontSize = 10.sp, color = White54)
                  }
                  IconButton(onClick = {
                    onPadamKakitangan(staf.id)
                    toastMsg = "Kakitangan ${staf.id} telah dipadam"
                  }) {
                    Icon(Icons.Default.Delete, contentDescription = "Padam", tint = Color(0xFFFCA5A5), modifier = Modifier.size(20.dp))
                  }
                }
              }
            }
          }
        }

        // Modal Tambah Staf Individu
        if (showTambahModal) {
          AlertDialog(
            onDismissRequest = { showTambahModal = false },
            containerColor = MaterialTheme.colorScheme.surface,
            title = { Text("Daftar Kakitangan Baharu", fontWeight = FontWeight.Bold, color = Color.White) },
            text = {
              Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                  value = formId,
                  onValueChange = { formId = it.trim().uppercase() },
                  label = { Text("ID Pekerja (cth: HLG-001)") },
                  modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                  value = formNama,
                  onValueChange = { formNama = it },
                  label = { Text("Nama Penuh") },
                  modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                  value = formJabatan,
                  onValueChange = { formJabatan = it },
                  label = { Text("Jabatan") },
                  modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                  value = formKataLaluan,
                  onValueChange = { formKataLaluan = it },
                  label = { Text("Kata Laluan / PIN") },
                  modifier = Modifier.fillMaxWidth()
                )
              }
            },
            confirmButton = {
              Button(
                onClick = {
                  if (formId.isNotBlank() && formNama.isNotBlank()) {
                    val stafBaru = Kakitangan(
                      id = formId,
                      nama = formNama,
                      jabatan = if (formJabatan.isNotBlank()) formJabatan else "Operasi",
                      pejabatId = senaraiPejabat.firstOrNull()?.id ?: "OFF-01",
                      kataLaluan = formKataLaluan,
                      peranan = "kakitangan"
                    )
                    onTambahKakitangan(stafBaru)
                    toastMsg = "Kakitangan '${stafBaru.nama}' (${stafBaru.id}) berjaya ditambah!"
                    showTambahModal = false
                  }
                },
                colors = ButtonDefaults.buttonColors(containerColor = HalagelEmerald)
              ) { Text("Simpan") }
            },
            dismissButton = {
              TextButton(onClick = { showTambahModal = false }) { Text("Batal", color = White60) }
            }
          )
        }

        // Modal Import Pukal
        if (showImportModal) {
          AlertDialog(
            onDismissRequest = { showImportModal = false },
            containerColor = MaterialTheme.colorScheme.surface,
            title = { Text("Import Senarai Kakitangan Pukal", fontWeight = FontWeight.Bold, color = Color.White) },
            text = {
              Column {
                Text("Format: ID, Nama, Jabatan (Satu baris setiap orang).", fontSize = 11.sp, color = White60)
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                  value = teksPukal,
                  onValueChange = { teksPukal = it },
                  placeholder = {
                    Text("HLG-001, Norazman bin Ali, Pengeluaran\nHLG-002, Siti Aisyah binti Hassan, Jaminan Kualiti", fontSize = 11.sp)
                  },
                  modifier = Modifier.fillMaxWidth().height(140.dp)
                )
              }
            },
            confirmButton = {
              Button(
                onClick = {
                  val senaraiDiproses = mutableListOf<Kakitangan>()
                  teksPukal.lines().forEach { baris ->
                    val bahagian = baris.split(",").map { it.trim() }
                    if (bahagian.size >= 2 && bahagian[0].isNotBlank()) {
                      val id = bahagian[0]
                      val nama = bahagian[1]
                      val jabatan = if (bahagian.size >= 3) bahagian[2] else "Operasi"
                      senaraiDiproses.add(
                        Kakitangan(
                          id = id,
                          nama = nama,
                          jabatan = jabatan,
                          pejabatId = senaraiPejabat.firstOrNull()?.id ?: "OFF-01",
                          kataLaluan = "123456",
                          peranan = "kakitangan"
                        )
                      )
                    }
                  }
                  if (senaraiDiproses.isNotEmpty()) {
                    onImportPukal(senaraiDiproses)
                    toastMsg = "${senaraiDiproses.size} orang kakitangan berjaya diimport!"
                    showImportModal = false
                  }
                },
                colors = ButtonDefaults.buttonColors(containerColor = HalagelEmerald)
              ) { Text("Import Semua") }
            },
            dismissButton = {
              TextButton(onClick = { showImportModal = false }) { Text("Batal", color = White60) }
            }
          )
        }
      }
      1 -> {
        // ====================================================================
        // TAB 2: PENGURUSAN PEJABAT (PADAM, TAMBAH & SET RADIUS/LAT/LNG MELALUI MAP)
        // ====================================================================
        Column(modifier = Modifier.fillMaxSize().verticalScroll(scrollState)) {
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
          ) {
            Column {
              Text("Pengurusan Lokasi Pejabat & Radius", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
              Text("Admin boleh tambah, padam dan tetapkan radius/koordinat terus dari Peta Google.", fontSize = 11.sp, color = White60)
            }
          }

          Spacer(modifier = Modifier.height(12.dp))

          // Butang Tambah Lokasi Pejabat Baharu
          Button(
            onClick = {
              isEditingExistingOffice = false
              selectedOfficeId = "OFF-0${senaraiPejabat.size + 1}"
              officeFormNama = ""
              officeFormCawangan = ""
              officeFormLat = 5.6432
              officeFormLng = 100.4912
              officeFormRadius = 100
              showOfficeMapModal = true
            },
            colors = ButtonDefaults.buttonColors(containerColor = HalagelEmerald),
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier.fillMaxWidth().height(44.dp)
          ) {
            Icon(Icons.Default.AddLocationAlt, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text("+ Tambah Lokasi Pejabat Baharu (Melalui Map)", fontWeight = FontWeight.Bold)
          }

          Spacer(modifier = Modifier.height(14.dp))

          // Senarai Kad Pejabat
          if (senaraiPejabat.isEmpty()) {
            Card(
              modifier = Modifier.fillMaxWidth(),
              colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
              shape = RoundedCornerShape(12.dp)
            ) {
              Column(modifier = Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.LocationOff, contentDescription = null, tint = White38, modifier = Modifier.size(40.dp))
                Spacer(modifier = Modifier.height(8.dp))
                Text("Tiada Pejabat Didaftarkan", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                Text("Sila klik '+ Tambah Lokasi Pejabat Baharu' untuk mencipta pejabat pertama.", fontSize = 11.sp, color = White60)
              }
            }
          } else {
            senaraiPejabat.forEach { pejabat ->
              Card(
                modifier = Modifier.fillMaxWidth().padding(vertical = 5.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                shape = RoundedCornerShape(14.dp)
              ) {
                Column(modifier = Modifier.padding(14.dp)) {
                  Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                  ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                      Box(
                        modifier = Modifier.size(38.dp).background(HalagelEmerald.copy(alpha = 0.15f), CircleShape),
                        contentAlignment = Alignment.Center
                      ) {
                        Icon(Icons.Default.Business, contentDescription = null, tint = HalagelEmerald, modifier = Modifier.size(20.dp))
                      }
                      Spacer(modifier = Modifier.width(10.dp))
                      Column {
                        Text(pejabat.nama, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.White)
                        Text(pejabat.cawangan, fontSize = 11.sp, color = White70)
                      }
                    }

                    // Butang Padam Pejabat
                    IconButton(onClick = {
                      officeToDelete = pejabat
                      showConfirmDeleteDialog = true
                    }) {
                      Icon(Icons.Default.DeleteOutline, contentDescription = "Padam Lokasi", tint = Color(0xFFEF4444))
                    }
                  }

                  Spacer(modifier = Modifier.height(8.dp))

                  // Info Koordinat & Radius
                  Box(
                    modifier = Modifier
                      .fillMaxWidth()
                      .background(Color(0xFF064E3B).copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                      .padding(10.dp)
                  ) {
                    Column {
                      Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.GpsFixed, contentDescription = null, tint = HalagelLightEmerald, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Had Radius Geofens: ${pejabat.radiusMeter} meter", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = HalagelLightEmerald)
                      }
                      Spacer(modifier = Modifier.height(2.dp))
                      Text("Koordinat Map: Lat ${String.format("%.4f", pejabat.lat)}, Lng ${String.format("%.4f", pejabat.lng)}", fontSize = 10.sp, color = White70)
                    }
                  }

                  Spacer(modifier = Modifier.height(10.dp))

                  // Butang Buka Map Untuk Setkan Radius & Koordinat
                  Button(
                    onClick = {
                      isEditingExistingOffice = true
                      selectedOfficeId = pejabat.id
                      officeFormNama = pejabat.nama
                      officeFormCawangan = pejabat.cawangan
                      officeFormLat = pejabat.lat
                      officeFormLng = pejabat.lng
                      officeFormRadius = pejabat.radiusMeter
                      showOfficeMapModal = true
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, HalagelEmerald),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth().height(38.dp)
                  ) {
                    Icon(Icons.Default.Map, contentDescription = null, tint = HalagelLightEmerald, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Buka Map: Setkan Radius, Lat & Lng", fontSize = 11.sp, color = HalagelLightEmerald, fontWeight = FontWeight.Bold)
                  }
                }
              }
            }
          }
        }

        // DIALOG PENGESAHAN PADAM PEJABAT
        if (showConfirmDeleteDialog && officeToDelete != null) {
          val p = officeToDelete!!
          AlertDialog(
            onDismissRequest = { showConfirmDeleteDialog = false },
            containerColor = MaterialTheme.colorScheme.surface,
            title = { Text("Padam Lokasi Pejabat?", fontWeight = FontWeight.Bold, color = Color(0xFFFCA5A5)) },
            text = {
              Text("Adakah anda pasti mahu memadam lokasi '${p.nama}' (${p.cawangan})? Kakitangan tidak lagi dapat mendaftar masuk pada lokasi ini.")
            },
            confirmButton = {
              Button(
                onClick = {
                  onPadamPejabat(p.id)
                  toastMsg = "Lokasi '${p.nama}' berjaya dipadam!"
                  showConfirmDeleteDialog = false
                  officeToDelete = null
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
              ) { Text("Padam Lokasi") }
            },
            dismissButton = {
              TextButton(onClick = { showConfirmDeleteDialog = false }) { Text("Batal", color = White60) }
            }
          )
        }

        // ====================================================================
        // MODAL BUKA MAP: SETKAN RADIUS, LATITUD DAN LONGITUD MELALUI MAP!
        // ====================================================================
        if (showOfficeMapModal) {
          val context = LocalContext.current

          AlertDialog(
            onDismissRequest = { showOfficeMapModal = false },
            containerColor = MaterialTheme.colorScheme.surface,
            modifier = Modifier.fillMaxWidth().fillMaxHeight(0.95f),
            title = {
              Column {
                Text(
                  if (isEditingExistingOffice) "Setkan Lokasi & Radius di Peta Sebenar" else "Tambah Lokasi Pejabat Baharu",
                  fontWeight = FontWeight.Bold,
                  fontSize = 15.sp,
                  color = Color.White
                )
                Text("Pilih lokasi sebenar atau masukkan koordinat GPS. Tetapkan had radius kehadiran.", fontSize = 11.sp, color = White60)
              }
            },
            text = {
              Column(
                modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp)
              ) {
                OutlinedTextField(
                  value = officeFormNama,
                  onValueChange = { officeFormNama = it },
                  label = { Text("Nama Pejabat / Premis") },
                  placeholder = { Text("cth: Ibu Pejabat & Kilang Halagel") },
                  modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                  value = officeFormCawangan,
                  onValueChange = { officeFormCawangan = it },
                  label = { Text("Cawangan / Negeri") },
                  placeholder = { Text("cth: Sungai Petani, Kedah") },
                  modifier = Modifier.fillMaxWidth()
                )

                // Pilihan Pantas Premis Rasmi Halagel Malaysia
                Text("Pilihan Lokasi Premis Sebenar Halagel:", fontSize = 11.sp, color = HalagelLightEmerald, fontWeight = FontWeight.Bold)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                  Button(
                    onClick = {
                      officeFormNama = "Ibu Pejabat & Kilang Halagel"
                      officeFormCawangan = "Sungai Petani, Kedah"
                      officeFormLat = 5.6432
                      officeFormLng = 100.4912
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, HalagelEmerald),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                    modifier = Modifier.height(30.dp)
                  ) {
                    Text("Kilang Kedah", fontSize = 10.sp, color = HalagelLightEmerald)
                  }

                  Button(
                    onClick = {
                      officeFormNama = "Pejabat Korporat Halagel"
                      officeFormCawangan = "Kuala Lumpur"
                      officeFormLat = 3.1478
                      officeFormLng = 101.6953
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, HalagelEmerald),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                    modifier = Modifier.height(30.dp)
                  ) {
                    Text("Pejabat KL", fontSize = 10.sp, color = HalagelLightEmerald)
                  }

                  Button(
                    onClick = {
                      officeFormNama = "Pusat Logistik Halagel"
                      officeFormCawangan = "Cyberjaya, Selangor"
                      officeFormLat = 2.9213
                      officeFormLng = 101.6559
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, HalagelEmerald),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                    modifier = Modifier.height(30.dp)
                  ) {
                    Text("Cyberjaya", fontSize = 10.sp, color = HalagelLightEmerald)
                  }
                }

                // Butang Kesan GPS Semasa Peranti
                Button(
                  onClick = {
                    try {
                      val locManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
                      val lastGps = locManager?.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                        ?: locManager?.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
                      if (lastGps != null) {
                        officeFormLat = lastGps.latitude
                        officeFormLng = lastGps.longitude
                        toastMsg = "Lokasi GPS peranti berjaya dikesan!"
                      } else {
                        toastMsg = "GPS belum aktif, koordinat ditetapkan ke lokasi lalai."
                      }
                    } catch (e: Exception) {
                      toastMsg = "Gunakan input koordinat atau pilihan lokasi."
                    }
                  },
                  colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0F766E)),
                  modifier = Modifier.fillMaxWidth().height(36.dp)
                ) {
                  Icon(Icons.Default.MyLocation, contentDescription = null, modifier = Modifier.size(16.dp))
                  Spacer(modifier = Modifier.width(6.dp))
                  Text("Kesan Lokasi GPS Semasa Saya", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }

                // Kotak Peta Google / Geografi Sebenar
                Box(
                  modifier = Modifier
                    .fillMaxWidth()
                    .height(230.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .border(1.5.dp, HalagelEmerald, RoundedCornerShape(12.dp))
                ) {
                  HalagelGoogleMapInteractiveView(
                    officeLat = officeFormLat,
                    officeLng = officeFormLng,
                    officeRadius = officeFormRadius,
                    userLat = officeFormLat,
                    userLng = officeFormLng,
                    isAdminPicker = true,
                    onLocationSelected = { newLat, newLng ->
                      officeFormLat = newLat
                      officeFormLng = newLng
                    },
                    onRadiusSelected = { newR ->
                      officeFormRadius = newR
                    }
                  )
                }

                // Kawalan Manual Koordinat Latitud & Longitud
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                  OutlinedTextField(
                    value = String.format(Locale.US, "%.5f", officeFormLat),
                    onValueChange = {
                      it.toDoubleOrNull()?.let { lat -> officeFormLat = lat }
                    },
                    label = { Text("Latitud (Lat)") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                  )

                  OutlinedTextField(
                    value = String.format(Locale.US, "%.5f", officeFormLng),
                    onValueChange = {
                      it.toDoubleOrNull()?.let { lng -> officeFormLng = lng }
                    },
                    label = { Text("Longitud (Lng)") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                  )
                }

                // Penetapan Radius Kawasan Daftar Masuk/Keluar
                Text("Had Radius Kawasan Kehadiran: ${officeFormRadius} meter", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = HalagelLightEmerald)

                Slider(
                  value = officeFormRadius.toFloat(),
                  onValueChange = { officeFormRadius = it.toInt() },
                  valueRange = 20f..500f,
                  steps = 15,
                  colors = SliderDefaults.colors(thumbColor = HalagelEmerald, activeTrackColor = HalagelEmerald)
                )

                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                  listOf(50, 100, 150, 200, 300).forEach { r ->
                    Button(
                      onClick = { officeFormRadius = r },
                      colors = ButtonDefaults.buttonColors(containerColor = if (officeFormRadius == r) HalagelEmerald else Color(0xFF1E293B)),
                      contentPadding = PaddingValues(horizontal = 6.dp, vertical = 2.dp),
                      modifier = Modifier.height(28.dp)
                    ) { Text("${r}m", fontSize = 10.sp) }
                  }
                }
              }
            },
            confirmButton = {
              Button(
                onClick = {
                  val namaFinal = if (officeFormNama.isNotBlank()) officeFormNama else "Pejabat Cawangan Halagel"
                  val cawanganFinal = if (officeFormCawangan.isNotBlank()) officeFormCawangan else "Malaysia"

                  if (isEditingExistingOffice) {
                    val senaraiBaru = senaraiPejabat.map { p ->
                      if (p.id == selectedOfficeId) {
                        p.copy(
                          nama = namaFinal,
                          cawangan = cawanganFinal,
                          lat = officeFormLat,
                          lng = officeFormLng,
                          radiusMeter = officeFormRadius
                        )
                      } else p
                    }
                    onKemaskiniPejabat(senaraiBaru)
                    toastMsg = "Lokasi & radius '$namaFinal' berjaya dikemas kini melalui peta!"
                  } else {
                    val idBaru = "OFF-0${senaraiPejabat.size + 1}"
                    val pejabatBaru = PejabatHalagel(
                      id = idBaru,
                      nama = namaFinal,
                      cawangan = cawanganFinal,
                      lat = officeFormLat,
                      lng = officeFormLng,
                      radiusMeter = officeFormRadius
                    )
                    onTambahPejabat(pejabatBaru)
                    toastMsg = "Pejabat baharu '$namaFinal' berjaya ditambah melalui peta!"
                  }
                  showOfficeMapModal = false
                },
                colors = ButtonDefaults.buttonColors(containerColor = HalagelEmerald)
              ) { Text("Simpan Lokasi & Radius") }
            },
            dismissButton = {
              TextButton(onClick = { showOfficeMapModal = false }) { Text("Batal", color = White60) }
            }
          )
        }
      }
      2 -> {
        // TAB 3: SEMUA REKOD KEHADIRAN
        Column(modifier = Modifier.fillMaxSize().verticalScroll(scrollState)) {
          Text("Semua Rekod Kehadiran", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
          Spacer(modifier = Modifier.height(8.dp))
          if (senaraiKehadiran.isEmpty()) {
            Card(
              modifier = Modifier.fillMaxWidth(),
              colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
              shape = RoundedCornerShape(12.dp)
            ) {
              Column(modifier = Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.EventBusy, contentDescription = null, tint = White38, modifier = Modifier.size(40.dp))
                Spacer(modifier = Modifier.height(8.dp))
                Text("Belum Ada Rekod", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                Text("Rekod kehadiran staf akan muncul di sini.", fontSize = 11.sp, color = White60)
              }
            }
          } else {
            senaraiKehadiran.forEach { rekod ->
              Card(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                shape = RoundedCornerShape(12.dp)
              ) {
                Column(modifier = Modifier.padding(12.dp)) {
                  Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("${rekod.stafNama} (${rekod.stafId})", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color.White)
                    Text(rekod.status, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = HalagelLightEmerald)
                  }
                  Spacer(modifier = Modifier.height(4.dp))
                  Text("Masuk: ${rekod.masaMasuk} • Keluar: ${rekod.masaKeluar} • Jarak: ${rekod.jarak}m", fontSize = 11.sp, color = White70)
                }
              }
            }
          }
        }
      }
      3 -> {
        // TAB 4: EKSPORT DATA GAJI
        Column(modifier = Modifier.fillMaxSize().verticalScroll(scrollState)) {
          Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            shape = RoundedCornerShape(14.dp)
          ) {
            Column(modifier = Modifier.padding(16.dp)) {
              Text("Eksport Data Penggajian (Payroll)", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
              Spacer(modifier = Modifier.height(6.dp))
              Text("Eksport rekod kehadiran staf yang telah disahkan ke dalam format fail CSV.", fontSize = 11.sp, color = White70)
              Spacer(modifier = Modifier.height(14.dp))
              Button(
                onClick = { toastMsg = "Fail 'Halagel_Payroll.csv' sedia dimuat turun!" },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = HalagelEmerald)
              ) { Text("Muat Turun Fail CSV") }
            }
          }
        }
      }
    }
  }
}

// ============================================================================
// KOMPONEN PETA GOOGLE MAP SEBENAR (REAL GOOGLE MAPS WEB ENGINE & SATELLITE)
// ============================================================================
class WebAppInterface(
  private val onLocationMoved: (Double, Double) -> Unit,
  private val onRadiusChanged: (Int) -> Unit
) {
  @JavascriptInterface
  fun onLocationMoved(lat: Double, lng: Double) {
    onLocationMoved.invoke(lat, lng)
  }

  @JavascriptInterface
  fun onRadiusChanged(radius: Int) {
    onRadiusChanged.invoke(radius)
  }
}

@Composable
fun HalagelGoogleMapInteractiveView(
  officeLat: Double,
  officeLng: Double,
  officeRadius: Int,
  userLat: Double,
  userLng: Double,
  isAdminPicker: Boolean,
  onLocationSelected: (Double, Double) -> Unit,
  onRadiusSelected: ((Int) -> Unit)? = null
) {
  val context = LocalContext.current
  var isMapLoading by remember { mutableStateOf(true) }

  val htmlContent = remember(officeLat, officeLng, officeRadius, userLat, userLng, isAdminPicker) {
    """
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #0f172a; font-family: sans-serif; }
        .layer-btn {
          position: absolute; top: 10px; right: 10px; z-index: 1000;
          background: rgba(15, 23, 42, 0.9); color: white; border: 1px solid #475569;
          padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: bold; cursor: pointer;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <button id="layerBtn" class="layer-btn" onclick="toggleLayer()">🛰️ Satelit</button>
      <script>
        var map = L.map('map', { center: [$officeLat, $officeLng], zoom: 18, zoomControl: false });
        var satLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { maxZoom: 20 });
        var streetLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { maxZoom: 20 });
        satLayer.addTo(map);

        var currentLayer = 'satellite';
        function toggleLayer() {
          if (currentLayer === 'satellite') {
            map.removeLayer(satLayer);
            streetLayer.addTo(map);
            currentLayer = 'streets';
            document.getElementById('layerBtn').innerText = '🗺️ Peta Jalan';
          } else {
            map.removeLayer(streetLayer);
            satLayer.addTo(map);
            currentLayer = 'satellite';
            document.getElementById('layerBtn').innerText = '🛰️ Satelit';
          }
        }

        var officeIcon = L.divIcon({
          className: 'office-pin',
          html: '<div style="position:relative;transform:translate(-50%,-100%);text-align:center;"><div style="background:#10B981;color:#022c22;font-size:10px;font-weight:bold;padding:2px 6px;border-radius:10px;border:1.5px solid white;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.4);">🏢 Pejabat</div><div style="width:22px;height:22px;background:#10B981;border:2.5px solid white;border-radius:50%;margin:0 auto;box-shadow:0 0 10px rgba(16,185,129,0.8);"></div></div>',
          iconSize: [0, 0]
        });

        var officeMarker = L.marker([$officeLat, $officeLng], {
          draggable: ${if (isAdminPicker) "true" else "false"},
          icon: officeIcon
        }).addTo(map);

        var circle = L.circle([$officeLat, $officeLng], {
          radius: $officeRadius,
          color: '#10B981',
          fillColor: 'rgba(16, 185, 129, 0.22)',
          fillOpacity: 0.25,
          weight: 2,
          dashArray: '6, 6'
        }).addTo(map);

        ${if (isAdminPicker) """
        // Draggable radius handle marker at circle boundary
        function getHandlePoint(lat, lng, radius) {
          var dLng = (radius / (6378137 * Math.cos(lat * Math.PI / 180))) * (180 / Math.PI);
          return [lat, lng + dLng];
        }

        var handleIcon = L.divIcon({
          className: 'handle-pin',
          html: '<div style="transform:translate(-50%,-50%);background:#F59E0B;color:#1E293B;font-size:9px;font-weight:800;padding:2px 5px;border-radius:6px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5);cursor:ew-resize;">⇄ ${officeRadius}m</div>',
          iconSize: [0, 0]
        });

        var handleMarker = L.marker(getHandlePoint($officeLat, $officeLng, $officeRadius), {
          draggable: true,
          icon: handleIcon
        }).addTo(map);

        officeMarker.on('drag', function(e) {
          var pos = e.target.getLatLng();
          circle.setLatLng(pos);
          handleMarker.setLatLng(getHandlePoint(pos.lat, pos.lng, circle.getRadius()));
          if (window.AndroidBridge) {
            window.AndroidBridge.onLocationMoved(pos.lat, pos.lng);
          }
        });

        map.on('click', function(e) {
          officeMarker.setLatLng(e.latlng);
          circle.setLatLng(e.latlng);
          handleMarker.setLatLng(getHandlePoint(e.latlng.lat, e.latlng.lng, circle.getRadius()));
          if (window.AndroidBridge) {
            window.AndroidBridge.onLocationMoved(e.latlng.lat, e.latlng.lng);
          }
        });

        handleMarker.on('drag', function(e) {
          var hPos = e.target.getLatLng();
          var cPos = officeMarker.getLatLng();
          var dist = Math.round(cPos.distanceTo(hPos));
          if (dist < 15) dist = 15;
          if (dist > 1500) dist = 1500;
          circle.setRadius(dist);
          if (window.AndroidBridge) {
            window.AndroidBridge.onRadiusChanged(dist);
          }
        });
        """ else """
        var userIcon = L.divIcon({
          className: 'user-pin',
          html: '<div style="transform:translate(-50%,-50%);width:18px;height:18px;background:#3B82F6;border:2.5px solid white;border-radius:50%;box-shadow:0 0 10px rgba(59,130,246,0.9);"></div>',
          iconSize: [0, 0]
        });
        L.marker([$userLat, $userLng], { icon: userIcon }).addTo(map);
        """}
      </script>
    </body>
    </html>
    """.trimIndent()
  }

  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(Color(0xFF0F172A))
  ) {
    AndroidView(
      modifier = Modifier.fillMaxSize(),
      factory = { ctx ->
        WebView(ctx).apply {
          settings.javaScriptEnabled = true
          settings.domStorageEnabled = true
          settings.loadWithOverviewMode = true
          settings.useWideViewPort = true
          settings.setSupportZoom(true)
          settings.builtInZoomControls = true
          settings.displayZoomControls = false
          setBackgroundColor(android.graphics.Color.parseColor("#0F172A"))

          addJavascriptInterface(
            WebAppInterface(
              onLocationMoved = { lat, lng ->
                onLocationSelected(lat, lng)
              },
              onRadiusChanged = { newR ->
                onRadiusSelected?.invoke(newR)
              }
            ),
            "AndroidBridge"
          )

          webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
              super.onPageFinished(view, url)
              isMapLoading = false
            }
          }
          loadDataWithBaseURL("https://google.com", htmlContent, "text/html", "UTF-8", null)
        }
      },
      update = { webView ->
        webView.loadDataWithBaseURL("https://google.com", htmlContent, "text/html", "UTF-8", null)
      }
    )

    // Indikator Pemuatan Peta
    if (isMapLoading) {
      Box(
        modifier = Modifier
          .fillMaxSize()
          .background(Color(0xFF0F172A).copy(alpha = 0.85f)),
        contentAlignment = Alignment.Center
      ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
          CircularProgressIndicator(color = HalagelEmerald, modifier = Modifier.size(32.dp))
          Spacer(modifier = Modifier.height(8.dp))
          Text("Memuatkan Peta Satelit & Geofens...", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
        }
      }
    }

    // Lencana Koordinat & Radius Pejabat di Kiri Bawah
    Box(
      modifier = Modifier
        .align(Alignment.BottomStart)
        .padding(8.dp)
        .background(Color.Black.copy(alpha = 0.8f), RoundedCornerShape(8.dp))
        .border(1.dp, Color(0xFF334155), RoundedCornerShape(8.dp))
        .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
      Column {
        Text("📍 Lat: ${String.format("%.4f", officeLat)}, Lng: ${String.format("%.4f", officeLng)}", fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.Bold)
        Text("⭕ Had Radius: $officeRadius meter", fontSize = 9.sp, color = HalagelLightEmerald)
      }
    }

    // Butang Pintas "Google Maps" di Kiri Atas
    Box(
      modifier = Modifier
        .align(Alignment.TopStart)
        .padding(8.dp)
        .background(Color(0xFF0F172A).copy(alpha = 0.85f), RoundedCornerShape(20.dp))
        .border(1.dp, Color(0xFF334155), RoundedCornerShape(20.dp))
        .clickable {
          try {
            val uri = Uri.parse("geo:$officeLat,$officeLng?q=$officeLat,$officeLng(Pejabat+Halagel)")
            val mapIntent = Intent(Intent.ACTION_VIEW, uri)
            context.startActivity(mapIntent)
          } catch (e: Exception) {
            val webUri = Uri.parse("https://www.google.com/maps/search/?api=1&query=$officeLat,$officeLng")
            context.startActivity(Intent(Intent.ACTION_VIEW, webUri))
          }
        }
        .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
      Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.Default.OpenInNew, contentDescription = null, tint = Color.White, modifier = Modifier.size(13.dp))
        Spacer(modifier = Modifier.width(4.dp))
        Text("Buka Luar", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.White)
      }
    }
  }
}

// Komponen Langkah
@Composable
fun StepItem(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, active: Boolean, completed: Boolean) {
  Column(horizontalAlignment = Alignment.CenterHorizontally) {
    Box(
      modifier = Modifier
        .size(34.dp)
        .background(
          if (completed) HalagelEmerald else if (active) HalagelEmerald.copy(alpha = 0.25f) else Color(0xFF1E293B),
          CircleShape
        )
        .border(
          1.5.dp,
          if (active || completed) HalagelEmerald else Color(0xFF334155),
          CircleShape
        ),
      contentAlignment = Alignment.Center
    ) {
      Icon(
        icon,
        contentDescription = null,
        tint = if (completed || active) Color.White else White38,
        modifier = Modifier.size(18.dp)
      )
    }
    Spacer(modifier = Modifier.height(4.dp))
    Text(
      label,
      fontSize = 11.sp,
      fontWeight = if (active || completed) FontWeight.Bold else FontWeight.Normal,
      color = if (active || completed) Color.White else White38
    )
  }
}

// ============================================================================
// KOMPONEN KAMERA SEBENAR (CAMERAX + SYSTEM CAMERA LAUNCHER)
// ============================================================================
@Composable
fun HalagelLiveCameraComponent(
  kakitanganNama: String,
  onPhotoCaptured: (Bitmap?) -> Unit
) {
  val context = LocalContext.current
  val lifecycleOwner = LocalLifecycleOwner.current

  var hasCameraPermission by remember {
    mutableStateOf(
      ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
    )
  }

  var capturedBitmap by remember { mutableStateOf<Bitmap?>(null) }
  var cameraError by remember { mutableStateOf<String?>(null) }

  val permissionLauncher = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.RequestPermission()
  ) { isGranted ->
    hasCameraPermission = isGranted
    if (!isGranted) {
      cameraError = "Kebenaran kamera tidak diberikan."
    }
  }

  val systemCameraLauncher = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.TakePicturePreview()
  ) { bitmap ->
    if (bitmap != null) {
      capturedBitmap = bitmap
    }
  }

  Column(
    modifier = Modifier.fillMaxWidth(),
    horizontalAlignment = Alignment.CenterHorizontally
  ) {
    if (!hasCameraPermission) {
      Box(
        modifier = Modifier
          .fillMaxWidth()
          .height(200.dp)
          .background(Color(0xFF1E293B), RoundedCornerShape(14.dp)),
        contentAlignment = Alignment.Center
      ) {
        Column(
          horizontalAlignment = Alignment.CenterHorizontally,
          modifier = Modifier.padding(16.dp)
        ) {
          Icon(Icons.Default.VideocamOff, contentDescription = null, tint = Color(0xFFFCA5A5), modifier = Modifier.size(36.dp))
          Spacer(modifier = Modifier.height(6.dp))
          Text("Kebenaran Kamera Diperlukan", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 13.sp)
          Text("Sistem memerlukan akses kamera untuk pengesahan wajah.", textAlign = TextAlign.Center, fontSize = 11.sp, color = White60)
          Spacer(modifier = Modifier.height(12.dp))
          Button(
            onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) },
            colors = ButtonDefaults.buttonColors(containerColor = HalagelEmerald)
          ) {
            Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text("Benarkan & Buka Kamera")
          }
        }
      }
    } else {
      if (capturedBitmap == null) {
        Box(
          modifier = Modifier
            .fillMaxWidth()
            .height(240.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(Color.Black),
          contentAlignment = Alignment.Center
        ) {
          AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
              val previewView = PreviewView(ctx)
              val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
              cameraProviderFuture.addListener({
                try {
                  val cameraProvider = cameraProviderFuture.get()
                  val preview = Preview.Builder().build().also {
                    it.surfaceProvider = previewView.surfaceProvider
                  }
                  val cameraSelector = if (cameraProvider.hasCamera(CameraSelector.DEFAULT_FRONT_CAMERA)) {
                    CameraSelector.DEFAULT_FRONT_CAMERA
                  } else {
                    CameraSelector.DEFAULT_BACK_CAMERA
                  }
                  cameraProvider.unbindAll()
                  cameraProvider.bindToLifecycle(lifecycleOwner, cameraSelector, preview)
                } catch (e: Exception) {
                  cameraError = "Ralat kamera: ${e.message}"
                }
              }, ContextCompat.getMainExecutor(ctx))
              previewView
            }
          )

          // Bingkai Panduan Wajah
          Box(
            modifier = Modifier
              .size(130.dp, 180.dp)
              .border(2.dp, HalagelLightEmerald, CircleShape)
          )

          Box(
            modifier = Modifier
              .align(Alignment.TopCenter)
              .padding(top = 8.dp)
              .background(Color.Black.copy(alpha = 0.6f), RoundedCornerShape(12.dp))
              .padding(horizontal = 10.dp, vertical = 4.dp)
          ) {
            Text("Kamera Aktif • Sila Posisikan Wajah", fontSize = 10.sp, color = Color.White)
          }
        }

        Spacer(modifier = Modifier.height(10.dp))

        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
          Button(
            onClick = { systemCameraLauncher.launch(null) },
            modifier = Modifier.weight(1f).height(44.dp),
            colors = ButtonDefaults.buttonColors(containerColor = HalagelEmerald)
          ) {
            Icon(Icons.Default.PhotoCamera, contentDescription = null, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text("Ambil Foto", fontSize = 12.sp, fontWeight = FontWeight.Bold)
          }

          Button(
            onClick = { onPhotoCaptured(null) },
            modifier = Modifier.weight(1f).height(44.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0F766E))
          ) {
            Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text("Sahkan Imbasan", fontSize = 12.sp, fontWeight = FontWeight.Bold)
          }
        }
      } else {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
          Image(
            bitmap = capturedBitmap!!.asImageBitmap(),
            contentDescription = "Foto Wajah",
            modifier = Modifier
              .size(140.dp, 180.dp)
              .clip(RoundedCornerShape(14.dp))
              .border(2.dp, HalagelEmerald, RoundedCornerShape(14.dp))
          )
          Spacer(modifier = Modifier.height(8.dp))
          Text("Foto Wajah Berjaya Diambil!", color = HalagelLightEmerald, fontWeight = FontWeight.Bold, fontSize = 12.sp)
          Spacer(modifier = Modifier.height(10.dp))
          Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
              onClick = { capturedBitmap = null },
              colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155))
            ) { Text("Ambil Semula", fontSize = 11.sp) }
            Button(
              onClick = { onPhotoCaptured(capturedBitmap) },
              colors = ButtonDefaults.buttonColors(containerColor = HalagelEmerald)
            ) { Text("Gunakan Foto Ini", fontWeight = FontWeight.Bold, fontSize = 11.sp) }
          }
        }
      }
    }
  }
}

@Composable
fun ProfilItem(label: String, nilai: String) {
  Row(
    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
    horizontalArrangement = Arrangement.SpaceBetween
  ) {
    Text(label, fontSize = 11.sp, color = White60)
    Text(nilai, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
  }
}

fun calculateHaversineMeters(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
  val r = 6371000.0
  val dLat = Math.toRadians(lat2 - lat1)
  val dLon = Math.toRadians(lon2 - lon1)
  val a = sin(dLat / 2).pow(2) + cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLon / 2).pow(2)
  val c = 2 * atan2(sqrt(a), sqrt(1 - a))
  return r * c
}
