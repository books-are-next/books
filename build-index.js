const yaml = require("js-yaml");
const fs = require("fs");

const tpl = fs.readFileSync("site/index.html.tpl", "utf8");
const paths = yaml.load(fs.readFileSync("paths.yml", "utf8"));
const books = paths.map((path) => {
	const manifest = JSON.parse(
		fs.readFileSync(`./${path}/manifest.json`, "utf8")
	);
	return `<li>${manifest.author}: <a href="/${path}/">${manifest.title}</a></li>`;
});

fs.writeFileSync(
	"index.html",
	tpl.replace("{{list}}", "<ul>" + books.join("") + "</ul>")
);
