#include <AntaresESP32HTTP.h>
#include <Servo.h>
#include "time.h"

// Network Configuration
#define WIFISSID "your_wifi_ssid"
#define PASSWORD "your_password"

// Antares Configuration
#define ACCESSKEY "a8ef1dd3211f65d6:19c53276f2829669"
#define projectName "smartAquarium"
#define deviceName "feedingMachine"

// NTP Server Configuration
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 25200; // GMT+7
const int daylightOffset_sec = 0;

// Global Variable
const int servoPin = 12;
int tem, hum, feed, trigFeeding = 0;
String isFeeding = "false";
String lastFeed = "";

// ScheduleTime
String rawSchedule = "";

// Ultrasonic
#define trigPin 26 //define pin 2 untuk trigPin
#define echoPin 25 //define pin 3 untuk echoPin

long duration, distance;

AntaresESP32HTTP antares(ACCESSKEY);
Servo servo1;

void setup() {
  pinMode(trigPin, OUTPUT); //pin trigPin sebagai output
  pinMode(echoPin, INPUT); //pin echoPin sebagai input

  Serial.begin(115200);
  servo1.attach(servoPin);
  antares.setDebug(true);
  antares.wifiConnection(WIFISSID, PASSWORD);
}

void loop() {
  // Get Latest Information
  antares.get(projectName, deviceName);
  tem = antares.getInt("temperature");
  hum = antares.getInt("humidity");
  feed = antares.getInt("feed");
  trigFeeding = antares.getInt("trigFeeding");
  isFeeding = antares.getString("isFeeding");
  String schedule = antares.getString("schedule");
  rawSchedule = schedule;

  // Config NTP
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  String tempScheduleDate = "";
  schedule = schedule + ",";

  Serial.println(schedule);
  Serial.println(sizeof(schedule));

  // Check if feed button is triggered
  if (trigFeeding == 1) {
    sendNuke();
  }

  if (getCurrTime() != lastFeed) {
    isFeeding = "false";
  }

  Serial.println("is feeding : " + isFeeding);
  for (int i = 1; i <= sizeof(schedule); i++) {
    if (i % 6 == 0) {
      Serial.println(getCurrTime());
      tempScheduleDate.remove(5);

      Serial.println(tempScheduleDate);

      // Compare Schedule time and Current Time
      if (getCurrTime() == tempScheduleDate) {
        // If not feed at same minutes
        if (isFeeding == "false") {
          sendNuke();
          isFeeding = "true";
          lastFeed = getCurrTime();
        }
      }

      tempScheduleDate = "";
    } else {
      tempScheduleDate = tempScheduleDate + schedule[i - 1];
    }
  }

  getFeedCapacityStatus();
  setAquariumData();

  delay(20000);
}

// Get Current Time Function
String getCurrTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("Failed to obtain time");
  }

  char currTime[10];
  strftime(currTime, sizeof(currTime), "%H:%M", &timeinfo);

  return currTime;
}

// Trigger Actuator
void sendNuke() {
  trigFeeding = 0;
  Serial.println("Send Nuke");

  for (int posDegrees = 0 ; posDegrees <= 180 ; posDegrees = posDegrees + 2) {
    servo1.write(posDegrees);
    delay(10);
  }

  delay(1000);

  for (int posDegrees = 180; posDegrees >= 0 ; posDegrees = posDegrees - 2) {
    servo1.write(posDegrees);
    delay(10);
  }
}

void setAquariumData() {
  // Add variable data into antares
  tem = random(25,30) ;
  hum = random(75,90);
  
  antares.add("temperature", tem);
  antares.add("humidity", hum);
  antares.add("feed", feed);
  antares.add("isFeeding", isFeeding);
  antares.add("trigFeeding", trigFeeding);
  antares.add("schedule", rawSchedule);
  antares.add("aquaID", "aquarium-1");
  antares.add("desc", "Many fish contains in this tank such as sepat, wader, lele, bawal, and many more.");
  antares.send(projectName, deviceName);
}

long getFeedCapacityStatus() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);

  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  duration = pulseIn(echoPin, HIGH);
  //kecepatan suara dibagi 2 (go and back)
  distance = duration * 0.034 / 2;

  if (distance >= 14 && distance <= 18) {
    feed = 20;
  } else if (distance > 18) {
    feed = 0;
  } else {
    feed = 100;
  }

  Serial.println(distance);
}
