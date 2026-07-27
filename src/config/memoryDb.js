// src/config/memoryDb.js
const { ObjectId } = require('mongodb');

class MemoryCollection {
  constructor(name) {
    this.name = name;
    this.docs = [];
  }

  async createIndex() {
    return Promise.resolve();
  }

  _match(doc, query) {
    if (!query || Object.keys(query).length === 0) return true;

    if (query.$or && Array.isArray(query.$or)) {
      const orMatch = query.$or.some(subQ => this._match(doc, subQ));
      if (!orMatch) return false;
    }

    for (const key of Object.keys(query)) {
      if (key === '$or') continue;
      const val = query[key];

      if (key === '_id') {
        const targetId = val instanceof ObjectId ? val.toString() : String(val);
        const docId = doc._id instanceof ObjectId ? doc._id.toString() : String(doc._id);
        if (targetId !== docId) return false;
      } else if (val && typeof val === 'object' && val.$regex) {
        const regex = new RegExp(val.$regex, val.$options || 'i');
        if (!regex.test(doc[key] || '')) return false;
      } else if (val && typeof val === 'object' && val.$exists !== undefined) {
        const exists = doc[key] !== undefined;
        if (exists !== val.$exists) return false;
      } else {
        if (doc[key] !== val) return false;
      }
    }
    return true;
  }

  async findOne(query) {
    const found = this.docs.find(d => this._match(d, query));
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  find(query = {}) {
    let results = this.docs.filter(d => this._match(d, query));
    return {
      sort: (sortObj = {}) => {
        const [sortKey, dir] = Object.entries(sortObj)[0] || ['createdAt', -1];
        results.sort((a, b) => {
          const valA = a[sortKey] || '';
          const valB = b[sortKey] || '';
          if (valA < valB) return dir === 1 ? -1 : 1;
          if (valA > valB) return dir === 1 ? 1 : -1;
          return 0;
        });
        return {
          toArray: async () => JSON.parse(JSON.stringify(results))
        };
      },
      toArray: async () => JSON.parse(JSON.stringify(results))
    };
  }

  async insertOne(doc) {
    const newDoc = { ...doc, _id: doc._id || new ObjectId() };
    this.docs.push(newDoc);
    return { insertedId: newDoc._id };
  }

  async insertMany(docsArr) {
    const insertedIds = {};
    const created = docsArr.map((d, i) => {
      const _id = d._id || new ObjectId();
      insertedIds[i] = _id;
      return { ...d, _id };
    });
    this.docs.push(...created);
    return { insertedIds };
  }

  async updateOne(query, update) {
    const idx = this.docs.findIndex(d => this._match(d, query));
    if (idx !== -1) {
      if (update.$set) {
        this.docs[idx] = { ...this.docs[idx], ...update.$set };
      }
      return { modifiedCount: 1 };
    }
    return { modifiedCount: 0 };
  }

  async deleteOne(query) {
    const idx = this.docs.findIndex(d => this._match(d, query));
    if (idx !== -1) {
      this.docs.splice(idx, 1);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  async deleteMany(query) {
    const initialLen = this.docs.length;
    this.docs = this.docs.filter(d => !this._match(d, query));
    return { deletedCount: initialLen - this.docs.length };
  }

  async countDocuments(query) {
    return this.docs.filter(d => this._match(d, query)).length;
  }
}

class MemoryDatabase {
  constructor() {
    this.collections = new Map();
  }

  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MemoryCollection(name));
    }
    return this.collections.get(name);
  }
}

module.exports = { MemoryDatabase };
