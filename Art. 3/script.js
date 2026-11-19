const stages = [...document.querySelectorAll("[data-stage]")];
const progressBar = document.querySelector(".progress-track");
const progressFill = document.querySelector(".progress-fill");
const progressCurrent = document.querySelector("#progress-current");
const progressLabel = document.querySelector("#progress-label");
const timelineStages = stages.filter((stage) => stage.classList.contains("timeline-stage"));
const journeyMarker = document.querySelector(".page-journey");
const travelingPaperclip = document.querySelector(".traveling-paperclip");
let scrollFrame = 0;

const labels = [
  "PROFILE", "SPECIALITY · PATIENTS", "SPECIALITY · IMCU",
  "WORKDAY · HANDOVER", "WORKDAY · INSPECTION", "WORKDAY · INTERACTION",
  "WORKDAY · EMERGENCIES", "WORKDAY · SHIFT END", "CHALLENGES", "EDITORS’ NOTES",
];

function setCurrentStage(index) {
  const current = Math.max(0, Math.min(index, stages.length - 1));
  document.body.dataset.current = String(current);
  progressCurrent.textContent = String(current + 1).padStart(2, "0");
  progressLabel.textContent = labels[current];
  progressFill.style.width = `${((current + 1) / stages.length) * 100}%`;
  progressBar.setAttribute("aria-valuenow", String(current + 1));
  updateJourneyMarker();
  updateTravelingPaperclip();
}

function updateTravelingPaperclip() {
  if (timelineStages.length === 0) {
    travelingPaperclip.style.opacity = "0";
    return;
  }

  const viewportCenter = window.scrollY + window.innerHeight / 2;
  const sides = ["right", "left", "right", "left", "right"];
  const photoIndex = Number(document.body.dataset.current) - 3;
  const photoElement = timelineStages[photoIndex]?.querySelector(".moment-photo");
  const photo = photoElement?.getBoundingClientRect();
  const clipHeight = travelingPaperclip.offsetHeight;
  const clipWidth = travelingPaperclip.offsetWidth;
  const side = sides[photoIndex];
  const angle = side === "right" ? 13 : -13;
  const radians = (angle * Math.PI) / 180;
  const rotatedWidth =
    Math.abs(clipWidth * Math.cos(radians)) +
    Math.abs(clipHeight * Math.sin(radians));
  const leftOffset = (clipWidth - rotatedWidth) / 2;
  const visibleOverlap = 12;
  const boxLeft = photo && side === "right"
    ? photo.right - visibleOverlap
    : photo
      ? photo.left - rotatedWidth + visibleOverlap
      : 0;
  const x = Math.max(
    2 - leftOffset,
    Math.min(
      window.innerWidth - rotatedWidth - 2 - leftOffset,
      boxLeft - leftOffset,
    ),
  );

  const firstStageTop =
    timelineStages[0].getBoundingClientRect().top + window.scrollY;
  const lastStageBottom =
    timelineStages[timelineStages.length - 1].getBoundingClientRect().bottom +
    window.scrollY;
  const inTimeline =
    viewportCenter >= firstStageTop &&
    viewportCenter <= lastStageBottom;

  if (photo) {
    travelingPaperclip.style.left = `${x}px`;
    travelingPaperclip.style.top = `${photo.top + 6}px`;
    travelingPaperclip.style.transform = `rotate(${angle}deg)`;
  }
  travelingPaperclip.style.opacity =
    inTimeline && photo ? "1" : "0";
}

function updateJourneyMarker() {
  const firstStage = timelineStages[0];
  const lastStage = timelineStages[timelineStages.length - 1];
  const timelineTop = firstStage.getBoundingClientRect().top + window.scrollY;
  const timelineBottom =
    lastStage.getBoundingClientRect().bottom + window.scrollY;
  const scrollPosition = window.scrollY + window.innerHeight / 2;
  const progress = Math.max(
    0,
    Math.min(1, (scrollPosition - timelineTop) / (timelineBottom - timelineTop)),
  );
  const availableTravel = journeyMarker.clientHeight - 30;

  journeyMarker.style.setProperty(
    "--journey-y",
    `${availableTravel * progress}px`,
  );
}

function scheduleJourneyUpdate() {
  if (scrollFrame) return;

  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = 0;
    updateJourneyMarker();
    updateTravelingPaperclip();
  });
}

const observer = new IntersectionObserver(
  (entries) => {
    const visibleStages = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

    if (visibleStages.length > 0) {
      setCurrentStage(stages.indexOf(visibleStages[0].target));
    }
  },
  {
    threshold: [0.25, 0.5, 0.75],
    rootMargin: "-10% 0px -10% 0px",
  },
);

stages.forEach((stage) => observer.observe(stage));
window.addEventListener("scroll", scheduleJourneyUpdate, { passive: true });
window.addEventListener("resize", scheduleJourneyUpdate);
