const webpush = require("web-push");
const PushSubscription = require("../models/PushSubscription");

// Configure VAPID
webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// POST /api/push/subscribe
const subscribe = async (req, res) => {
  const { subscription } = req.body;
  if (!subscription?.endpoint) return res.status(400).json({ message: "Invalid subscription" });

  try {
    await PushSubscription.findOneAndUpdate(
      { user: req.user._id, "subscription.endpoint": subscription.endpoint },
      { user: req.user._id, subscription },
      { upsert: true, new: true }
    );
    res.json({ message: "Subscribed to push notifications" });
  } catch (err) {
    res.status(500).json({ message: "Failed to subscribe", error: err.message });
  }
};

// DELETE /api/push/unsubscribe
const unsubscribe = async (req, res) => {
  const { endpoint } = req.body;
  await PushSubscription.deleteOne({ user: req.user._id, "subscription.endpoint": endpoint });
  res.json({ message: "Unsubscribed" });
};

// Send push to specific users (called from messageController)
const sendPushToUsers = async (userIds, payload) => {
  const subs = await PushSubscription.find({ user: { $in: userIds } });
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(s.subscription, JSON.stringify(payload)).catch(async (err) => {
        // Remove expired/invalid subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: s._id });
        }
      })
    )
  );
  return results;
};

module.exports = { subscribe, unsubscribe, sendPushToUsers };
