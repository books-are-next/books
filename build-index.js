const http = require("http");
const https = require("https");
const yaml = require("js-yaml");
const fs = require("fs");
const path = require("path");

const tpl = fs.readFileSync("site/index.html.tpl", "utf8");
const urls = yaml.load(fs.readFileSync("urls.yml", "utf8"));
const dls = urls.map((url) =>
	httpRequest("get", path.join(url, "manifest.json"))
);

const links = Promise.all(dls).then((responses) => {
	const books = responses.map(async (res, index) => {
		let manifest = {};

		if (res.statusCode === 301) {
			const response2 = await httpRequest("get", res.headers.location);
			manifest = response2.body;
		} else {
			manifest = res.body;
		}

		if (manifest != "") {
			return `<li>${manifest.author}: <a href="${urls[index]}">${manifest.title}</a></li>`;
		} else {
			return ``;
		}
	});

	Promise.all(books).then((loadedBooks) => {
		fs.writeFileSync(
			"index.html",
			tpl.replace("{{list}}", "<ul>" + loadedBooks.join("") + "</ul>")
		);
	});
});

function httpRequest(method, url, body = null) {
	if (!["get", "post", "head"].includes(method)) {
		throw new Error(`Invalid method: ${method}`);
	}

	let urlObject;

	try {
		urlObject = new URL(url);
	} catch (error) {
		throw new Error(`Invalid url ${url}`);
	}

	if (body && method !== "post") {
		throw new Error(
			`Invalid use of the body parameter while using the ${method.toUpperCase()} method.`
		);
	}

	let options = {
		method: method.toUpperCase(),
		hostname: urlObject.hostname,
		port: urlObject.port,
		path: urlObject.pathname,
	};

	if (body) {
		options.headers = { "Content-Length": Buffer.byteLength(body) };
	}

	return new Promise((resolve, reject) => {
		const protocol = urlObject.protocol === "https:" ? https : http;

		const clientRequest = protocol.request(options, (incomingMessage) => {
			// Response object.
			let response = {
				statusCode: incomingMessage.statusCode,
				headers: incomingMessage.headers,
				body: [],
			};

			// Collect response body data.
			incomingMessage.on("data", (chunk) => {
				response.body.push(chunk);
			});

			// Resolve on end.
			incomingMessage.on("end", () => {
				if (response.body.length) {
					response.body = response.body.join("");

					try {
						response.body = JSON.parse(response.body);
					} catch (error) {
						// Silently fail if response is not JSON.
					}
				}

				resolve(response);
			});
		});

		// Reject on request error.
		clientRequest.on("error", (error) => {
			reject(error);
		});

		// Write request body if present.
		if (body) {
			clientRequest.write(body);
		}

		// Close HTTP connection.
		clientRequest.end();
	});
}
