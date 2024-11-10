import axios from "axios";
import { expect } from "chai";

const BASE_URL = "http://localhost:8000";

describe("POST /createWorkspace", () => {
  // Define sample data for testing
  const validWorkspaceData = {
    firstName: "Sam",
    lastName: "Uel",
    owner_email: "Sam@gmail.com",
    workspaceName: "SamWorkspace",
    password: "strongpassword123",
  };

  it("should create a new workspace and user successfully", async () => {
    try {
      const response = await axios.post(
        `${BASE_URL}/createWorkspace`,
        validWorkspaceData
      );
      expect(response.status).to.equal(201);
      expect(response.data).to.have.property(
        "message",
        "Workspace and User successfully created"
      );
      expect(response.data).to.have.property("userId");
      expect(response.data).to.have.property("workspaceId");
    } catch (error) {
      throw new Error(`Expected status 201 but got ${error.response.status}`);
    }
  });

  it("should fail if the email already owns a workspace", async () => {
    try {
      // Assuming the email is already in use, send a request with the same owner_email
      await axios.post(`${BASE_URL}/createWorkspace`, validWorkspaceData);
      throw new Error("Expected error but request succeeded");
    } catch (error) {
      expect(error.response.status).to.equal(400);
      expect(error.response.data).to.have.property(
        "message",
        "Email already Owns a WorkSpace!!"
      );
    }
  });

  it("should fail if the workspace name is already taken", async () => {
    const duplicateWorkspaceData = {
      ...validWorkspaceData,
      owner_email: "jane.doe@example.com", // New email to bypass email ownership check
    };

    try {
      // Create a new workspace with the same workspaceName but different email
      await axios.post(`${BASE_URL}/createWorkspace`, duplicateWorkspaceData);
      throw new Error("Expected error but request succeeded");
    } catch (error) {
      expect(error.response.status).to.equal(400);
      expect(error.response.data).to.have.property(
        "message",
        "Workspace Name is being Used."
      );
    }
  });

  it("should fail with a 500 error if data is missing", async () => {
    const incompleteData = {
      firstName: "Alice",
      lastName: "Smith",
      owner_email: "alice.smith@example.com",
    }; // Missing workspaceName and password

    try {
      await axios.post(`${BASE_URL}/createWorkspace`, incompleteData);
      throw new Error("Expected error but request succeeded");
    } catch (error) {
      expect(error.response.status).to.equal(500);
      expect(error.response.data)
        .to.have.property("message")
        .that.includes("Internal Server Error");
    }
  });

  after(async () => {
    // Clean up the created test data, such as by deleting users or workspaces if needed
  });
});
