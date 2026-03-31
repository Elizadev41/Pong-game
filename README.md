# Paddle Ball

Paddle Ball is a small retro-style browser game and the first game I ever made, which makes this project really special to me.

I originally started this project around August 2025 during GWC. In December 2025, I came back to it, made more changes, and got it to a more finished state. Later, I found the project again and decided it deserved another update, so I moved it into VS Code and worked through a lot of bugs during the process. Some of the debugging and final cleanup was helped by Claude and Codex AI, especially while fixing issues from moving the code and polishing the game.

# About The Game

This is a paddle-and-ball survival game built with HTML, CSS, and JavaScript using the canvas API.

The goal is simple:

- Keep the ball from falling past the paddle
- Score points every time you bounce the ball back up
- Survive as the game speeds up
- Try to beat your best score

As your score goes up, the game gets harder because the paddle slowly shrinks.

# Features

- Retro arcade-inspired look
- Mouse and keyboard controls
- Start screen and how-to-play screen
- Pause and restart controls
- Difficulty modes
- Lives system
- Best score saved with localStorage
- Increasing difficulty over time
- End-of-run stat summary
- Shield power-up
- Particle effects and animated background

# Controls

- Mouse: move the paddle
- A / D: move left and right
- Left Arrow / Right Arrow: move left and right
- P: pause or resume
- R: restart
- Enter or Space: start from the welcome screen
- 1 / 2 / 3: choose Easy / Normal / Hard from the welcome screen


# Project Files

- index.html sets up the page and canvas
- style.css styles the game frame and page
- script.js contains the full game logic
- p5play.js is included in the project folder from earlier work, though the current version of the game runs from script.js

