===========================================================
   GYM MANAGEMENT SYSTEM - SIMPLE GUIDE
===========================================================

You do NOT need to install any programming tools.
You only need ONE free program: Docker Desktop.


-----------------------------------------------------------
1) INSTALL DOCKER DESKTOP (only once)
-----------------------------------------------------------
- Go to:  https://www.docker.com/products/docker-desktop/
- Click "Download for Windows" and install it.
- After installing, RESTART your computer if it asks.
- Open "Docker Desktop" from the Start menu.
- Wait until the little whale icon says it is "Running".


-----------------------------------------------------------
2) OPEN THE PROJECT
-----------------------------------------------------------
- If you received a ZIP file, right-click it and choose
  "Extract All..." to unzip it to a folder.
- Open that folder. You should see files like
  START_SYSTEM.bat and STOP_SYSTEM.bat.


-----------------------------------------------------------
3) START THE SYSTEM
-----------------------------------------------------------
- Make sure Docker Desktop is open and "Running".
- Double-click:  START_SYSTEM.bat
- The FIRST time, it may take a few minutes while it sets
  everything up. Please be patient and keep the window open.
- When it is ready, your web browser opens automatically.

  Website address:  http://localhost:5173
  Login email:      admin@gym.local
  Login password:   admin12345

  (You can change the password later from inside the app.)


-----------------------------------------------------------
4) STOP THE SYSTEM
-----------------------------------------------------------
- Double-click:  STOP_SYSTEM.bat
- Your data is kept safe. Nothing is deleted.
- Start it again anytime with START_SYSTEM.bat.


-----------------------------------------------------------
5) RESET THE DATABASE (erase all data)
-----------------------------------------------------------
- Double-click:  RESET_DATABASE.bat
- It will ask you to type YES to confirm.
- WARNING: this deletes ALL data permanently and starts fresh.
- Only use this if you want to clear everything.


-----------------------------------------------------------
6) IF SOMETHING DOES NOT WORK
-----------------------------------------------------------
- "Docker is not running" message:
    Open Docker Desktop, wait until it says "Running",
    then double-click START_SYSTEM.bat again.

- The browser page does not load right away:
    Wait 30 seconds and refresh the page (press F5).
    The first start is the slowest.

- The page still does not open:
    Open your browser and type this yourself:
    http://localhost:5173


-----------------------------------------------------------
QUICK SUMMARY
-----------------------------------------------------------
Start  -> START_SYSTEM.bat
Stop   -> STOP_SYSTEM.bat
Reset  -> RESET_DATABASE.bat
Open   -> http://localhost:5173
===========================================================
