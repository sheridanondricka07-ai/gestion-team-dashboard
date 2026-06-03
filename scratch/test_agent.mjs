import handler from '../api/ai-agent.mjs';

const mockReq = {
    method: 'POST',
    body: {
        message: 'generate for me records for s_wmn3_2159 with all RPs available (does not affectected to any server) in Arecord type',
        history: []
    }
};

const mockRes = {
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(data) {
        console.log("Response status:", this.statusCode);
        console.log("Response data:\n", JSON.stringify(data, null, 2));
    },
    send(msg) {
        console.log("Response send:", msg);
    }
};

console.log("Running AI Agent handler test...");
handler(mockReq, mockRes).catch(err => {
    console.error("Handler error:", err);
});
