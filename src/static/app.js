document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // helper: safely escape text for insertion into innerHTML
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select options to avoid duplicates
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = Math.max(0, details.max_participants - details.participants.length);

        // build participants markup
        const participants = details.participants || [];
        let participantsMarkup;
        if (participants.length > 0) {
          participantsMarkup = `
            <div class="participants">
              <strong>Participants:</strong>
              <ul class="participants-list">
                ${participants.map(p => `<li class="participant-item" data-email="${escapeHtml(p)}"><span class="participant-email">${escapeHtml(p)}</span><button class="delete-btn" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(p)}" aria-label="Remove participant">✖</button></li>`).join("")}
              </ul>
            </div>
          `;
        } else {
          participantsMarkup = `
            <div class="participants no-participants">
              <em>No participants yet</em>
            </div>
          `;
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsMarkup}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();
        // Refresh activities so the new participant shows up immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();

  // Delegate delete clicks for participant removal
  activitiesList.addEventListener("click", async (event) => {
    const target = event.target;
    if (target.matches(".delete-btn")) {
      const activity = target.dataset.activity;
      const email = target.dataset.email;

      if (!activity || !email) return;

      // Optionally confirm removal
      const confirmed = window.confirm(`Remove ${email} from ${activity}?`);
      if (!confirmed) return;

      try {
        const resp = await fetch(
          `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`,
          { method: "DELETE" }
        );

        const result = await resp.json().catch(() => ({}));

        if (resp.ok) {
          // refresh list
          fetchActivities();
          messageDiv.textContent = result.message || `${email} unregistered from ${activity}`;
          messageDiv.className = "message success";
          messageDiv.classList.remove("hidden");
          setTimeout(() => messageDiv.classList.add("hidden"), 4000);
        } else {
          messageDiv.textContent = result.detail || "Failed to remove participant";
          messageDiv.className = "message error";
          messageDiv.classList.remove("hidden");
        }
      } catch (err) {
        console.error("Error removing participant:", err);
        messageDiv.textContent = "Failed to remove participant. Please try again.";
        messageDiv.className = "message error";
        messageDiv.classList.remove("hidden");
      }
    }
  });
});
