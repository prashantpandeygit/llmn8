This repo is an implementation of an LLM, which is downloaded locally into user's directory, given the user has to get the launcher from the url - microchat.rictr.in, and has to-
1. extract the zip file
2. install the microchat-ui-installer and launch it.
3. (the ui is offline, and no buttons accessible).
4. go to the other folder exe.win-amd64-3.11 and launch the microchat.exe
5. the local api will lauch within a time frame of 10-15 seconds.
6. now the microchat app shows connectivity and the download model button is now functional.
7. press the download button (progress can be seen in the background on the terminal).
8. after the model has downloaded its completion, now press the load the model.
9. the model will be loaded into the ui within 5 seconds.
10. the UI is ready to chat with.
(the model will respond to lesser tokens quickly and vice-versa)

To reproduce the app through codebase if the user wants model changes and tweaking- 
1. get to the client directory.
2. launch terminal for step 3 & 4.
3. npm install (make changes if needed).
4. npm run build:win (to create the executable file for the ui, created in the dist folder).
5. get to the server directory.
6. create a virtual environment and install dependencies as per pyproject.toml (as uv package manager is used)
7. launch terminal for step 8 & 9.
8. python setup.py build
9. exe file created in the dist folder (the exe must be launched inside the folder for reproducibility)

