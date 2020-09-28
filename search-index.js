const lunr = require('lunr');
const redis = require('redis');
const rediSearchBindings = require('redis-redisearch');
const rediSearch = require('redisearchclient');
rediSearchBindings(redis);

const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_HOST = process.env.REDIS_HOST || "0.0.0.0";
// TODO: Add more configuration options for redis


export class lunrIndexer {
    constructor() {
        this.builder = new lunr.Builder();
        this.builder.pipeline.remove(lunr.trimmer);
        this.builder.field('title');
        this.builder.field('tags');
        this.builder.field('scopes');
    };

    add(doc) {
        this.builder.add(doc);
    };

    build() {
        this.idx = this.builder.build();
    };

    search(q) {
        return this.idx.search(q);
    }
};


export class redisIndexer {
    constructor() {
        const client = redis.createClient(REDIS_PORT, REDIS_HOST);

        this.index = rediSearch(client, "md_index");
        this.index.dropIndex((err) => {
            if (err) {
                console.error(err);
            };
        });
        this.index.createIndex([
                this.index.fieldDefinition.text("title", true),
                this.index.fieldDefinition.text("tags", true),
                this.index.fieldDefinition.text("scopes", true)
            ],
            (err) => {
                if (err) { throw err; };
            });
    };

    async add(doc) {
        if (typeof(doc.tags) == "undefined") {
            doc.tags = "";
        } else {
            doc.tags = doc.tags.toString();
        };
        if (typeof(doc.scopes) == "undefined") {
            doc.scopes = "";
        } else {
            doc.scopes = doc.scopes.toString();
        };
        doc.title = doc.title.toString();

        this.index.add(doc.id, {
                title: doc.title,
                tags: doc.tags,
                scopes: doc.scopes
            }, {
                score: 1
            },
            (err) => {
                if (err) { throw err; };
            });
    };

    build() {
        () => {};
    };

    search(q) {
        this.index.search(
            q, {}, (err, results) => {
                if (String(err).includes('Syntax error at offset')) {
                    () => {};
                } else if (err) {
                    console.error(err);
                } else {
                    if (results.results.length > 0) {
                        var matches = [];
                        results.results.map(obj => {
                            matches.push({ ref: obj.docId, doc: obj.doc });
                        });
                    };
                    console.log(matches);
                    return matches;
                };
            });

        console.log(matches);
    };
};