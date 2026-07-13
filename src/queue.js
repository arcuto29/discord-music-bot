// Per-server music queues
const queues = new Map();

/**
 * Get or create a queue for a guild
 */
function getQueue(guildId) {
  if (!queues.has(guildId)) {
    queues.set(guildId, {
      songs: [],
      connection: null,
      player: null,
      playing: false,
      paused: false,
      loop: false,
      loopQueue: false,
      volume: 100,
      radio: null,
      radioProcess: null,
      textChannel: null,
    });
  }
  return queues.get(guildId);
}

/**
 * Delete a guild's queue
 */
function deleteQueue(guildId) {
  queues.delete(guildId);
}

/**
 * Check if a guild has an active queue
 */
function hasQueue(guildId) {
  return queues.has(guildId);
}

module.exports = { getQueue, deleteQueue, hasQueue };
