const http = require("http");

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: "localhost",
        port: 3000,
        path,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(dataString ? { "Content-Length": Buffer.byteLength(dataString) } : {}),
        },
      },
      (res) => {
        let responseBody = "";
        res.on("data", (chunk) => (responseBody += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
          } catch (e) {
            resolve({ status: res.statusCode, text: responseBody });
          }
        });
      }
    );
    req.on("error", reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function run() {
  console.log("=== Testing Group Creation & Sync ===");
  const groupId = "testgrp_" + Math.random().toString(36).substring(7);
  
  // 1. Create group with creator as admin, requireAdminApproval = true, and invited user
  const createRes = await request("POST", "/api/v1/groups", {
    groupId,
    name: "Alpha Security Squad",
    description: "Post-quantum research group",
    creatorId: "user_alice",
    creatorName: "Alice Admin",
    requireAdminApproval: true,
    onlyAdminsCanPost: false,
    invitedUserIds: ["user_bob"],
  });
  console.log("Create Group status:", createRes.status, createRes.data?.group?.name);
  if (createRes.data?.group?.name !== "Alpha Security Squad") {
    throw new Error("Group creation failed");
  }

  // 2. Fetch group by clean ID
  const fetchRes = await request("GET", `/api/v1/groups/${groupId}`);
  console.log("Fetch Group Name:", fetchRes.data?.group?.name, "Members:", fetchRes.data?.group?.members?.length);
  if (fetchRes.data?.group?.name !== "Alpha Security Squad") {
    throw new Error("Group fetch name mismatch");
  }

  // 3. User Charlie attempts to join group with requireAdminApproval = true
  const joinRes1 = await request("POST", `/api/v1/groups/${groupId}/join`, {
    userId: "user_charlie",
    displayName: "Charlie",
  });
  console.log("Charlie Join Request (Approval Required):", joinRes1.data);
  if (!joinRes1.data?.pendingApproval) {
    throw new Error("Expected pendingApproval = true");
  }

  // 4. Check Alice's admin approvals via /api/v1/users/user_alice/requests
  const aliceReqs = await request("GET", "/api/v1/users/user_alice/requests");
  console.log("Alice pending approvals count:", aliceReqs.data?.adminApprovals?.length);
  const charlieApproval = aliceReqs.data?.adminApprovals?.find(a => a.user?.userId === "user_charlie");
  if (!charlieApproval) {
    throw new Error("Charlie's pending approval not listed for Alice");
  }

  // 5. Alice approves Charlie
  const approveRes = await request("POST", `/api/v1/groups/${groupId}/approve_request`, {
    adminId: "user_alice",
    targetUserId: "user_charlie",
  });
  console.log("Alice Approve Charlie status:", approveRes.status, approveRes.data?.success);

  // 6. Check Bob's invitations
  const bobReqs = await request("GET", "/api/v1/users/user_bob/requests");
  console.log("Bob pending invites count:", bobReqs.data?.invites?.length);
  const bobInvite = bobReqs.data?.invites?.find(i => i.groupId === groupId);
  if (!bobInvite) {
    throw new Error("Bob did not receive group invite");
  }

  // 7. Bob accepts the invite
  const bobRespondRes = await request("POST", `/api/v1/requests/${bobInvite.id}/respond`, {
    userId: "user_bob",
    displayName: "Bob",
    action: "accept",
  });
  console.log("Bob accept invite status:", bobRespondRes.status, bobRespondRes.data?.action);

  // 8. Verify updated group members
  const afterJoinFetch = await request("GET", `/api/v1/groups/${groupId}`);
  console.log("Final Group Members Count:", afterJoinFetch.data?.group?.members?.length);
  const memberIds = afterJoinFetch.data?.group?.members?.map(m => m.userId);
  console.log("Member IDs in group:", memberIds);
  if (!memberIds.includes("user_alice") || !memberIds.includes("user_charlie") || !memberIds.includes("user_bob")) {
    throw new Error("Members list incomplete");
  }

  // 9. Alice updates group settings: onlyAdminsCanPost = true
  const updateRes = await request("POST", `/api/v1/groups/${groupId}/update`, {
    adminId: "user_alice",
    onlyAdminsCanPost: true,
  });
  console.log("Update onlyAdminsCanPost:", updateRes.data?.group?.onlyAdminsCanPost);

  console.log("\n ALL END-TO-END GROUP TESTS PASSED SUCCESSFULLY! ");
}

run().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
