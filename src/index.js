import {
  start,
  loadConfig,
  loadSourceFiles,
  generatePages,
  savePages,
  createMarkdownRenderer,
  createTemplateRenderer,
  helpers,
} from 'fledermaus';

start('Building the site...');

let config = loadConfig('config');
let options = config.base;

let renderMarkdown = createMarkdownRenderer();
let renderTemplate = createTemplateRenderer({
  root: options.templatesFolder,
});

let documents = loadSourceFiles(options.sourceFolder, options.sourceTypes, {
  renderers: {
    md: renderMarkdown,
  },
});

let pages = generatePages(documents, config, helpers, { jsx: renderTemplate });

savePages(pages, options.publicFolder);