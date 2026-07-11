// Boundary input rules shared by the routes. Kept separate so they can be
// unit-tested without booting the server.

const TASK_STATUSES = ['pending', 'in_progress', 'completed'];
const MAX_TITLE = 200;

// City names: letters (any language), numbers, spaces, and . , ' -
const CITY_PATTERN = /^[\p{L}\p{N} ,.'-]+$/u;

function isValidCity(city) {
  return typeof city === 'string' && city.trim().length > 0 && CITY_PATTERN.test(city.trim());
}

function normalizeTitle(title) {
  return typeof title === 'string' ? title.trim() : '';
}

function isValidTitle(title) {
  const t = normalizeTitle(title);
  return t.length > 0 && t.length <= MAX_TITLE;
}

function isValidStatus(status) {
  return TASK_STATUSES.includes(status);
}

module.exports = { TASK_STATUSES, MAX_TITLE, isValidCity, normalizeTitle, isValidTitle, isValidStatus };
