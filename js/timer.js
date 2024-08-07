document.addEventListener("DOMContentLoaded", function () {
  let timer;
  let isRunning = false;
  let focusedMinutesToday = 0;
  let focusedMinutesTotal = 0;
  let startTime;
  let selectedDuration = 25; // Default duration in minutes
  const minutesDisplay = document.getElementById("minutes");
  const secondsDisplay = document.getElementById("seconds");
  const startTimerButton = document.getElementById("start-timer");
  const resetTimerButton = document.getElementById("reset-timer");
  const timerButtons = document.querySelectorAll(".timer_btn");
  const focusedMinutesTodayElement = document.getElementById(
    "focused-minutes-today-txt"
  );
  const focusedMinutesTotalElement = document.getElementById(
    "focused-minutes-total-txt"
  );
  const pointsElement = document.getElementById("points");
  const timerElement = document.getElementById("timer");
  const progressBar = document.getElementById("level-bar");
  console.log([progressBar]);
  console.log(document.getElementById("animation-1"));

  const CIRCUMFERENCE = 2 * Math.PI * 45; // Radius is 45 as per the provided SVG
  const baseTimerPathRemaining = document.getElementById(
    "base-timer-path-remaining"
  );
  baseTimerPathRemaining.setAttribute("stroke-dasharray", CIRCUMFERENCE);

  // Load Lottie animations
  const animations = {
    1: lottie.loadAnimation({
      container: document.getElementById("animation-1"),
      renderer: "svg",
      loop: true,
      autoplay: false,
      path: "./animations/cat-idle.json",
    }),
    2: lottie.loadAnimation({
      container: document.getElementById("animation-2"),
      renderer: "svg",
      loop: true,
      autoplay: false,
      path: "./animations/cat-working.json",
    }),
  };

  // Function to show a specific animation
  function showAnimation(animationNumber) {
    Object.values(animations).forEach((anim, index) => {
      if (index + 1 === animationNumber) {
        anim.play();

        anim.wrapper.style.display = "block";
      } else {
        console.log(anim);
        anim.pause();
        anim.wrapper.style.display = "none";
      }
    });
  }

  // Initially show animation-1
  showAnimation(1);

  // Check daily reset at midnight
  setInterval(checkDailyReset, 60 * 1000); // Check every minute

  function checkDailyReset() {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      resetDailyFocusedMinutes();
    }
  }

  function resetDailyFocusedMinutes() {
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${
      today.getMonth() + 1
    }-${today.getDate()}`;
    chrome.storage.local.get("focusData", (data) => {
      let focusData = data.focusData || {};
      if (focusData[dateKey]) {
        focusData[dateKey] = 0;
        chrome.storage.local.set({ focusData }, () => {
          focusedMinutesToday = 0;
          updateFocusedMinutesDisplay();
        });
      }
    });
  }

  // Check if there's an active timer in storage
  chrome.storage.local.get(
    ["pomodoroTimer", "focusData", "totalPoints", "progress"],
    (data) => {
      if (data.pomodoroTimer && data.pomodoroTimer.isRunning) {
        const { endTime, selectedDuration } = data.pomodoroTimer;
        const remainingTime = endTime - Date.now();
        if (remainingTime > 0) {
          startExistingTimer(remainingTime, selectedDuration);
        } else {
          resetTimerState();
        }
      } else {
        resetTimerState();
      }

      // Calculate today's focused minutes and update display
      const today = new Date();
      const dateKey = `${today.getFullYear()}-${
        today.getMonth() + 1
      }-${today.getDate()}`;
      if (data.focusData && data.focusData[dateKey]) {
        focusedMinutesToday = data.focusData[dateKey];
        updateFocusedMinutesDisplay();
      }

      // Calculate total focused minutes and update display
      if (data.focusData) {
        focusedMinutesTotal = Object.values(data.focusData).reduce(
          (acc, val) => acc + val,
          0
        );
        updateTotalFocusedMinutesDisplay();
      }

      // Update total points display
      pointsElement.textContent = data.totalPoints || 0;

      // Update progress bar display
      if (data.progress) {
        console.log("there is stored progress:", data.progress);
        updateProgressBar(data.progress);
      }
    }
  );

  function startExistingTimer(remainingTime, duration) {
    isRunning = true;
    selectedDuration = duration;
    startTime = Date.now() - (selectedDuration * 60 * 1000 - remainingTime);
    timer = setInterval(updateTimerDisplay, 100);
    toggleTimerControls(false);
    showTimerElement();
    showAnimation(2);
  }

  function resetTimerState() {
    isRunning = false;
    startTime = null;
    clearInterval(timer);
    minutesDisplay.textContent = "00";
    secondsDisplay.textContent = "00";
    // Reset the stroke-dasharray to the full circumference
    baseTimerPathRemaining.setAttribute("stroke-dasharray", CIRCUMFERENCE);
    updateFocusedMinutesDisplay();
    toggleTimerControls(true);
    hideTimerElement();
    broadcastTimerState();
    showAnimation(1);
    // Show header
    document.querySelector("header").style.display = "flex";
    document.querySelector("#timer-on").style.display = "none";
    chrome.storage.local.set({ headerVisible: true, messageOn: false });
  }

  startTimerButton.addEventListener("click", startTimer);
  resetTimerButton.addEventListener("click", resetTimer);

  timerButtons.forEach((button) => {
    button.addEventListener("click", function (event) {
      event.preventDefault();
      updateSelectedDuration(button);
    });
  });

  function startTimer() {
    console.log("called start timer");
    if (!isRunning) {
      const activeButton = document.querySelector(".timer_btn.is-active");
      if (activeButton) {
        console.log("theres an active button", activeButton);
        isRunning = true;
        startTime = Date.now();
        const endTime = startTime + selectedDuration * 60 * 1000;
        chrome.storage.local.set(
          {
            pomodoroTimer: { isRunning: true, endTime, selectedDuration },
            headerVisible: false,
            messageOn: true,
          },
          () => {
            broadcastTimerState(); // Broadcast start state to other tabs
          }
        );
        timer = setInterval(updateTimerDisplay, 100);
        toggleTimerControls(false);
        updateTimerDisplay();
        showAnimation(2);

        // Hide header
        document.querySelector("header").style.display = "none";
        document.querySelector("#timer-on").style.display = "flex";
      } else {
        alert("Please select a duration before starting the timer.");
      }
    }
  }

  function resetTimer() {
    chrome.storage.local.set({ pomodoroTimer: { isRunning: false } }, () => {
      resetTimerState();
      broadcastTimerState();
      //show sad modal
      document.getElementById("modal-sad").style.display = "flex";
    });
  }

  function updateTimerDisplay() {
    const remainingTime = startTime + selectedDuration * 60 * 1000 - Date.now();
    if (remainingTime <= 0) {
      clearInterval(timer);
      isRunning = false;
      focusedMinutesToday += selectedDuration;
      focusedMinutesTotal += selectedDuration;
      saveFocusedMinutes();
      const pointsToAdd = addPoints(selectedDuration); // Add points and get the added points
      increaseProgressBar();

      // Show modal and update content
      document.getElementById("modal").style.display = "flex";
      document.getElementById("focusedMinutes").textContent = selectedDuration;
      document.getElementById("new-minutes").textContent = selectedDuration;
      document.getElementById("new-points").textContent = pointsToAdd;

      console.log(
        "Time is up! You focused for " + selectedDuration + " minutes."
      );
      chrome.storage.local.set(
        {
          pomodoroTimer: { isRunning: false },
          headerVisible: true,
          messageOn: false,
        },
        () => {
          toggleTimerControls(true);
          broadcastTimerState();
        }
      );
      // Show header
      document.querySelector("header").style.display = "flex";
      document.querySelector("#timer-on").style.display = "none";
    } else {
      const minutes = Math.floor(remainingTime / (1000 * 60));
      const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
      minutesDisplay.textContent = String(minutes).padStart(2, "0");
      secondsDisplay.textContent = String(seconds).padStart(2, "0");
      setCircleDasharray(remainingTime);
    }
    updateFocusedMinutesDisplay();
    updateTotalFocusedMinutesDisplay();
  }

  function setCircleDasharray(remainingTime) {
    const timeFraction = remainingTime / (selectedDuration * 60 * 1000);
    const circleDasharray = `${(timeFraction * CIRCUMFERENCE).toFixed(
      0
    )} ${CIRCUMFERENCE}`;
    baseTimerPathRemaining.setAttribute("stroke-dasharray", circleDasharray);
  }

  function saveFocusedMinutes() {
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${
      today.getMonth() + 1
    }-${today.getDate()}`;
    chrome.storage.local.get("focusData", (data) => {
      let focusData = data.focusData || {};
      if (!focusData[dateKey]) {
        focusData[dateKey] = 0;
      }
      focusData[dateKey] += selectedDuration;
      chrome.storage.local.set({ focusData });
    });
  }

  function addPoints(duration) {
    let points = 0;
    if (duration === 25) {
      points = 10;
    } else if (duration === 50) {
      points = 25;
    } else if (duration === 75) {
      points = 40;
    }

    chrome.storage.local.get("totalPoints", (data) => {
      let totalPoints = data.totalPoints || 0;
      totalPoints += points;
      chrome.storage.local.set({ totalPoints }, () => {
        pointsElement.textContent = totalPoints;
      });
    });

    return points; // Return the added points
  }

  function updateFocusedMinutesDisplay() {
    if (focusedMinutesTodayElement) {
      focusedMinutesTodayElement.textContent = focusedMinutesToday;
    }
  }

  function updateTotalFocusedMinutesDisplay() {
    if (focusedMinutesTotalElement) {
      focusedMinutesTotalElement.textContent = focusedMinutesTotal;
    }
  }

  function updateSelectedDuration(button) {
    // Remove the 'is-active' class from all buttons
    timerButtons.forEach((btn) => btn.classList.remove("is-active"));
    // Add the 'is-active' class to the clicked button
    button.classList.add("is-active");

    selectedDuration = parseInt(button.getAttribute("data-duration"), 10);
    minutesDisplay.textContent = String(selectedDuration).padStart(2, "0");

    if (isRunning) {
      clearInterval(timer);
      startTimer();
    }
  }

  function toggleTimerControls(showControls) {
    if (showControls) {
      document.querySelector(".timer-btns").style.display = "flex";
      startTimerButton.style.display = "flex";
      resetTimerButton.style.display = "none";
    } else {
      document.querySelector(".timer-btns").style.display = "none";
      startTimerButton.style.display = "none";
      resetTimerButton.style.display = "block";
    }
  }
  // Show the timer element
  function showTimerElement() {
    if (timerElement) {
      timerElement.style.display = "flex";
    }
  }
  // Hide the timer element
  function hideTimerElement() {
    if (timerElement) {
      timerElement.style.display = "none";
    }
  }

  // Broadcast timer state to other tabs
  function broadcastTimerState() {
    chrome.storage.local.get("pomodoroTimer", (data) => {
      console.log("called broadcastTimerState", data, data.pomodoroTimer);
      chrome.storage.local.set(
        { pomodoroTimer: data.pomodoroTimer },
        function () {
          if (chrome.runtime.lastError) {
            console.error(
              "Error setting pomodoroTimer:",
              chrome.runtime.lastError
            );
            return;
          }
          console.log("Timer state broadcasted successfully.");
        }
      );
    });
  }
  // Listen for changes in pomodoroTimer state from other tabs
  chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace === "local") {
      if (changes.headerVisible) {
        const header = document.querySelector("header");
        if (header) {
          header.style.display = changes.headerVisible.newValue
            ? "flex"
            : "none";
        }
      }
      if (changes.messageOn) {
        const messageOn = document.querySelector("#timer-on");
        if (messageOn) {
          messageOn.style.display = changes.messageOn.newValue
            ? "flex"
            : "none";
        }
      }

      if (changes.pomodoroTimer) {
        const timerData = changes.pomodoroTimer.newValue;
        if (timerData && typeof timerData.isRunning !== "undefined") {
          if (timerData.isRunning) {
            const remainingTime = timerData.endTime - Date.now();
            if (remainingTime > 0) {
              clearInterval(timer);
              startExistingTimer(remainingTime, timerData.selectedDuration);
            } else {
              resetTimerState();
            }
          } else {
            resetTimerState(); // Clear interval and update state
          }
        } else {
          // Handle cases where timerData is not defined or isRunning is not defined
          console.warn(
            "Unexpected timerData structure or undefined isRunning property",
            timerData
          );
          toggleTimerControls(true); // Default to showing select and start button
        }
      }

      // Update focused minutes if changed in storage
      if (changes.focusData) {
        const today = new Date();
        const dateKey = `${today.getFullYear()}-${
          today.getMonth() + 1
        }-${today.getDate()}`;
        focusedMinutesToday = changes.focusData.newValue[dateKey] || 0;
        updateFocusedMinutesDisplay();
        focusedMinutesTotal = Object.values(changes.focusData.newValue).reduce(
          (acc, val) => acc + val,
          0
        );
        updateTotalFocusedMinutesDisplay();
      }

      // Update total points if changed in storage
      if (changes.totalPoints) {
        pointsElement.textContent = changes.totalPoints.newValue || 0;
      }
    }
  });

  // Initial check to sync controls state and header visibility
  chrome.storage.local.get(
    ["pomodoroTimer", "headerVisible", "messageOn"],
    (data) => {
      if (data.pomodoroTimer && data.pomodoroTimer.isRunning) {
        toggleTimerControls(false); // Hide select and start button
        showTimerElement();
      } else {
        toggleTimerControls(true); // Show select and start button
        hideTimerElement();
      }

      if (data.headerVisible !== undefined) {
        document.querySelector("header").style.display = data.headerVisible
          ? "flex"
          : "none";
      }
      if (data.messageOn !== undefined) {
        document.querySelector("#timer-on").style.display = data.messageOn
          ? "flex"
          : "none";
      }
    }
  );

  // Initial check to sync controls state
  chrome.storage.local.get("pomodoroTimer", (data) => {
    if (data.pomodoroTimer && data.pomodoroTimer.isRunning) {
      toggleTimerControls(false); // Hide select and start button
      showTimerElement();
    } else {
      toggleTimerControls(true); // Show select and start button
      hideTimerElement();
    }
  });
});

// Increase progress bar by 5% and save to storage
function increaseProgressBar() {
  console.log("called 'increaseProgressBar'");
  chrome.storage.local.get("progress", (data) => {
    console.log(data.progress, "progress in storage");
    let progress = data.progress || 0;
    progress += 5;
    if (progress > 100) progress = 100; // Cap progress at 100%
    chrome.storage.local.set({ progress }, () => {
      updateProgressBar(progress);
    });
  });
}

// Update progress bar width
function updateProgressBar(progress) {
  const progressBar = document.getElementById("level-bar");
  console.log("called 'updateProgressBar'", progressBar);
  progressBar.style.width = `${progress}%`;
}
