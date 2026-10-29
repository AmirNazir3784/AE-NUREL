import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { blogPosts, postForSlug, publishedPosts, readablePosts, relatedPosts } from "../src/content/blog/registry.ts";

describe("blog publication boundaries", () => {
  it("publishes the owner's approved article with its actual release date and organization attribution", () => {
    const post = blogPosts.find(post => post.id === "audio-to-text-guide");
    assert.equal(post.status, "published");
    assert.equal(post.author.type, "Organization");
    assert.equal(post.author.name, "AENural");
    assert.ok(Number.isFinite(Date.parse(post.publishedAt)));
    assert.equal(publishedPosts().includes(post), true);
  });

  it("keeps production and test readers from opening draft or unknown slugs", () => {
    const previous = process.env.NODE_ENV;
    const draft = { ...blogPosts[0], slug: "unapproved-draft", status: "draft", publishedAt: undefined };
    try {
      for (const environment of ["production", "test"]) {
        process.env.NODE_ENV = environment;
        assert.deepEqual(readablePosts(), publishedPosts());
        assert.equal(postForSlug("unapproved-draft", [draft]), undefined);
        assert.equal(postForSlug("convert-audio-to-text-online-free").id, "audio-to-text-guide");
        assert.equal(postForSlug("does-not-exist"), undefined);
      }
      process.env.NODE_ENV = "development";
      assert.equal(postForSlug("unapproved-draft", [draft]), draft);
      assert.equal(postForSlug("convert-audio-to-text-online-free").id, "audio-to-text-guide");
      assert.equal(postForSlug("does-not-exist"), undefined);
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });

  it("selects and orders published content without mutating the content registry", () => {
    const base = blogPosts[0];
    const fixtures = [
      { ...base, id: "draft", status: "draft", publishedAt: "2026-10-29T10:00:00+05:00" },
      { ...base, id: "older", slug: "older", status: "published", publishedAt: "2026-10-01T10:00:00+05:00" },
      { ...base, id: "undated", status: "published", publishedAt: undefined },
      { ...base, id: "newer", slug: "newer", status: "published", publishedAt: "2026-10-29T10:00:00+05:00" },
    ];
    assert.deepEqual(publishedPosts(fixtures).map(post => post.id), ["newer", "older"]);
    assert.equal(fixtures[0].id, "draft");
  });

  it("does not expose a draft as related reading", () => {
    for (const post of blogPosts) {
      const related = relatedPosts(post);
      assert.ok(related.every(item => item.id !== post.id && item.status === "published" && item.publishedAt));
      assert.equal(new Set(related.map(item => item.id)).size, related.length);
    }
  });
});
