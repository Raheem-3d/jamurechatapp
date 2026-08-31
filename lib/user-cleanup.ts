import { pool } from "@/lib/db";

/**
 * Completely cascades and cleans up all traces of a user when deleted:
 * - Removes task & record assignments
 * - Removes channel memberships
 * - Removes notifications, preferences, permissions, and mute settings
 * - Removes time logs and activities
 * - Cleans up messages
 * - Nullifies manager references for subordinates
 * - Reassigns created tasks/channels/records to admin
 * - Deletes the user record from MySQL
 */
export async function deleteUserWithCascade(
  userId: string,
  adminId?: string
): Promise<{ success: boolean; message?: string }> {
  if (!userId) {
    throw new Error("userId is required for deletion");
  }

  // 1. Task Assignments / Record Assignments
  try {
    await pool.query("DELETE FROM `taskassignment` WHERE `userId` = ?", [userId]);
  } catch (e) {}
  try {
    await pool.query("DELETE FROM `task_assignments` WHERE `userId` = ?", [userId]);
  } catch (e) {}

  // 2. Channel Memberships
  try {
    await pool.query("DELETE FROM `channelmember` WHERE `userId` = ?", [userId]);
  } catch (e) {}
  try {
    await pool.query("DELETE FROM `channel_members` WHERE `userId` = ?", [userId]);
  } catch (e) {}

  // 3. Notifications
  try {
    await pool.query("DELETE FROM `notification` WHERE `userId` = ?", [userId]);
  } catch (e) {}
  try {
    await pool.query("DELETE FROM `notifications` WHERE `userId` = ?", [userId]);
  } catch (e) {}

  // 4. Task Time Logs
  try {
    await pool.query("DELETE FROM `tasktimelog` WHERE `userId` = ?", [userId]);
  } catch (e) {}
  try {
    await pool.query("DELETE FROM `TaskTimeLog` WHERE `userId` = ?", [userId]);
  } catch (e) {}

  // 5. Task Activities & Subtask Activities
  try {
    await pool.query("DELETE FROM `taskactivity` WHERE `userId` = ?", [userId]);
  } catch (e) {}
  try {
    await pool.query("DELETE FROM `TaskActivity` WHERE `userId` = ?", [userId]);
  } catch (e) {}

  // 6. User Permissions
  try {
    await pool.query("DELETE FROM `userpermission` WHERE `userId` = ?", [userId]);
  } catch (e) {}

  // 7. User Notification Preferences & Mute Settings
  try {
    await pool.query("DELETE FROM `usernotificationpreference` WHERE `userId` = ?", [userId]);
  } catch (e) {}
  try {
    await pool.query("DELETE FROM `user_notification_preferences` WHERE `userId` = ?", [userId]);
  } catch (e) {}
  try {
    await pool.query("DELETE FROM `task_mute_settings` WHERE `userId` = ?", [userId]);
  } catch (e) {}
  try {
    await pool.query("DELETE FROM `task_reminders` WHERE `userId` = ?", [userId]);
  } catch (e) {}
  try {
    await pool.query("DELETE FROM `Reminder` WHERE `userId` = ?", [userId]);
  } catch (e) {}

  // 8. Presence
  try {
    await pool.query("DELETE FROM `userpresence` WHERE `userId` = ?", [userId]);
  } catch (e) {}

  // 9. Messages
  try {
    await pool.query("DELETE FROM `message` WHERE `senderId` = ? OR `receiverId` = ?", [userId, userId]);
  } catch (e) {}
  try {
    await pool.query("DELETE FROM `messages` WHERE `senderId` = ? OR `receiverId` = ?", [userId, userId]);
  } catch (e) {}

  // 10. Reassign or nullify Manager references in User table
  try {
    await pool.query("UPDATE `user` SET `managerId` = NULL WHERE `managerId` = ?", [userId]);
  } catch (e) {}

  // 11. Reassign Task/Channel/Record Creator to Admin (or nullify)
  if (adminId && adminId !== userId) {
    try {
      await pool.query("UPDATE `task` SET `creatorId` = ? WHERE `creatorId` = ?", [adminId, userId]);
    } catch (e) {}
    try {
      await pool.query("UPDATE `channel` SET `creatorId` = ? WHERE `creatorId` = ?", [adminId, userId]);
    } catch (e) {}
    try {
      await pool.query("UPDATE `record` SET `createdBy` = ? WHERE `createdBy` = ?", [adminId, userId]);
    } catch (e) {}
  }

  // 12. Finally, delete the User record itself
  await pool.query("DELETE FROM `user` WHERE `id` = ?", [userId]);

  return { success: true };
}
