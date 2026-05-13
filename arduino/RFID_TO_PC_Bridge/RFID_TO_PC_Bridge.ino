#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define SS_PIN 10
#define RST_PIN 9

MFRC522 rfid(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2);

int buzzer = 7;

byte authorizedUID[] = {0xC1, 0x72, 0xB3, 0x02};

String lastLocation = "";
unsigned long lastTime = 0;

bool toggleLocation = false;

void setup() {
  Serial.begin(9600);
  SPI.begin();
  rfid.PCD_Init();

  lcd.init();
  lcd.backlight();

  pinMode(buzzer, OUTPUT);

  lcd.setCursor(0,0);
  lcd.print("Scan Card");
}

void loop() {

  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }

  // Read UID
  byte readUID[4];
  for (byte i = 0; i < 4; i++) {
    readUID[i] = rfid.uid.uidByte[i];
  }

  // Send UID to frontend (optional)
  Serial.print("UID: ");
  for (byte i = 0; i < 4; i++) {
    Serial.print(readUID[i], HEX);
  }
  Serial.println();

  // Check card
  if (!checkUID(readUID, authorizedUID)) {
    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print("Unknown Card");

    tone(buzzer, 500, 1000);
    delay(2000);

    resetLCD();
    stopRFID();
    return;
  }

  // Simulate location
  String location = toggleLocation ? "Chennai" : "Dehradun";
  toggleLocation = !toggleLocation;

  unsigned long currentTime = millis();

  // 🚨 FRAUD DETECTION
  if (lastLocation != "" && location != lastLocation) {
    if ((currentTime - lastTime) < 10000) {

      lcd.clear();
      lcd.setCursor(0,0);
      lcd.print("FRAUD ALERT!");
      lcd.setCursor(0,1);
      lcd.print(location);

      tone(buzzer, 400, 2000);

      delay(3000);

      resetLCD();
      stopRFID();
      return;
    }
  }

  // ✅ NORMAL ACCESS
  lcd.clear();
  lcd.setCursor(0,0);
  lcd.print("WELCOME");

  lcd.setCursor(0,1);
  lcd.print(location);

  tone(buzzer, 1000, 200);

  lastLocation = location;
  lastTime = currentTime;

  delay(2000);

  resetLCD();
  stopRFID();
}

// Reset LCD
void resetLCD() {
  lcd.clear();
  lcd.setCursor(0,0);
  lcd.print("Scan Card");
}

// Stop RFID properly
void stopRFID() {
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

// UID check
bool checkUID(byte *currentUID, byte *allowedUID) {
  for (byte i = 0; i < 4; i++) {
    if (currentUID[i] != allowedUID[i]) {
      return false;
    }
  }
  return true;
}