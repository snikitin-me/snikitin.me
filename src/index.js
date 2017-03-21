import {
  start,
  loadConfig,
  loadSourceFiles,
  generatePages,
  savePages,
  paginate,
  orderDocuments,
  groupDocuments,
  createMarkdownRenderer,
  createTemplateRenderer,
  helpers,
} from 'fledermaus';

start('Building the blog...');

let config = loadConfig('config');
let options = config.base;

// Remove language (en or ru) from a URL
let removeLang = url => url.replace(/(en|ru)\//, '');

let renderMarkdown = createMarkdownRenderer();
let renderTemplate = createTemplateRenderer({
  root: options.templatesFolder,
});

let documents = loadSourceFiles(options.sourceFolder, options.sourceTypes, {
  renderers: {
    md: renderMarkdown,
  },
  // Custom front matter field parsers
  fieldParsers: {
    // Save `date` field as a timestamp
    timestamp: (timestamp, attrs) => Date.parse(attrs.date),
    // Convert `date` field to a Date object
    date: (date, attrs) => new Date(Date.parse(date)),
  },
  // Cut separator
  cutTag: options.cutTag,
});

// Oder by date, newest first
documents = orderDocuments(documents, ['-timestamp']);

// Group posts by language
let documentsByLanguage = groupDocuments(documents, 'lang');
let languages = Object.keys(documentsByLanguage);

documents = languages.reduce((result, lang) => {
  let docs = documentsByLanguage[lang];
  let newDocs = [];

  // Translations
  // Append all posts with a field indicating whether this post has a translation
  // (post with the same URL in another language)
  let translationLang = lang === 'ru' ? 'en' : 'ru';
  let hasTranslation = (url) => {
    url = removeLang(url);
    return !!documentsByLanguage[translationLang].find(doc => removeLang(doc.url) === url);
  }
  docs = docs.map((doc) => {
    return {
      ...doc,
      translation: hasTranslation(doc.url),
    };
  });

  // Pagination
  newDocs.push(...paginate(docs, {
    sourcePathPrefix: lang,
    urlPrefix: `/${lang}/`,
    documentsPerPage: options.postsPerPage,
    layout: 'index',
    index: true,
    extra: {
      lang,
    },
  }));

  // Tags
  let postsByTag = groupDocuments(docs, 'tags');
  let tags = Object.keys(postsByTag);
  newDocs.push(...tags.reduce((tagsResult, tag) => {
    let tagDocs = postsByTag[tag];
    let tagsNewDocs = paginate(tagDocs, {
      sourcePathPrefix: `${lang}/tags/${tag}`,
      urlPrefix: `/${lang}/tags/${tag}`,
      documentsPerPage: options.postsPerPage,
      layout: 'tag',
      extra: {
        lang,
        tag,
      },
    });
    return [...tagsResult, ...tagsNewDocs];
  }, []));

  // RSS feed
  newDocs.push({
    sourcePath: `${lang}/feed.xml`,
    url: '/feed.xml',
    layout: 'RSS',
    items: docs.slice(0, options.postsInFeed),
    title: config[lang].title,
    description: config[lang].description,
    copyright: config[lang].author,
    imageUrl: '/images/userpic.jpg',
    lang,
  });

  return [...result, ...docs, ...newDocs];
}, []);

let pages = generatePages(documents, config, helpers, { jsx: renderTemplate });

savePages(pages, options.publicFolder);