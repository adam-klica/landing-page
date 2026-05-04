#!/usr/bin/env node
import { MongoClient } from "mongodb";
import "dotenv/config";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

const dbName = process.env.MONGODB_DB || "abgc";

const client = new MongoClient(uri);

async function run() {
  await client.connect();
  const db = client.db(dbName);
  console.log(`Setting up indexes on db: ${dbName}`);

  await db.collection("posts").createIndexes([
    { key: { type: 1, status: 1, createdAt: -1 }, name: "posts_type_status_createdAt" },
    { key: { type: 1, status: 1, eventDate: -1, createdAt: -1 }, name: "posts_type_status_eventDate_createdAt" },
    { key: { slug: 1, status: 1 }, name: "posts_slug_status" },
    { key: { locale: 1, status: 1, slug: 1 }, name: "posts_locale_status_slug" },
  ]);

  await db.collection("users").createIndexes([
    { key: { email: 1 }, name: "users_email" },
    { key: { username: 1 }, name: "users_username" },
    { key: { role: 1 }, name: "users_role" },
    { key: { status: 1 }, name: "users_status" },
    { key: { resetToken: 1 }, name: "users_resetToken" },
    { key: { createdAt: -1 }, name: "users_createdAt" },
    { key: { lastActivity: -1 }, name: "users_lastActivity" },
  ]);

  await db.collection("connections").createIndexes([
    { key: { requester: 1, recipient: 1 }, name: "connections_requester_recipient" },
    { key: { status: 1 }, name: "connections_status" },
  ]);

  await db.collection("messages").createIndexes([
    { key: { sender: 1, receiver: 1, createdAt: -1 }, name: "messages_sender_receiver_createdAt" },
    { key: { groupId: 1, createdAt: -1 }, name: "messages_groupId_createdAt" },
    { key: { receiverId: 1, isRead: 1, groupId: 1 }, name: "messages_receiverId_isRead_groupId" },
  ]);

  await db.collection("groups").createIndexes([
    { key: { members: 1 }, name: "groups_members" },
  ]);

  await db.collection("visitors").createIndexes([
    { key: { visit_date: -1 }, name: "visitors_visit_date" },
    { key: { visitedAt: -1 }, name: "visitors_visitedAt" },
  ]);

  console.log("Indexes ready.");
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => client.close());
