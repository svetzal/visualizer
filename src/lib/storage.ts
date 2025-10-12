import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  SCHEMA_MAP,
  EntityType,
  AnyEntity,
  StorageChangeEvent,
  ENTITY_TYPES,
} from './schemas.js';

export class JSONStorage extends EventEmitter {
  private cache: Map<EntityType, AnyEntity[]>;
  private basePath: string;

  constructor(basePath: string) {
    super();
    this.cache = new Map();
    this.basePath = basePath;
  }

  async initialize(): Promise<void> {
    // Ensure base directory exists
    await fs.mkdir(this.basePath, { recursive: true });

    // Load all entity types into cache
    for (const type of ENTITY_TYPES) {
      await this.load(type);
    }
  }

  private getFilePath(type: EntityType): string {
    return path.join(this.basePath, `${type}s.json`);
  }

  async load(type: EntityType): Promise<AnyEntity[]> {
    const filePath = this.getFilePath(type);

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const entities = JSON.parse(data);

      // Validate each entity
      const schema = SCHEMA_MAP[type];
      const validated = entities.map((e: any) => schema.parse(e));

      this.cache.set(type, validated);
      return validated;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist yet, initialize with empty array
        this.cache.set(type, []);
        await this.writeFile(type, []);
        return [];
      }
      throw error;
    }
  }

  private async writeFile(type: EntityType, entities: AnyEntity[]): Promise<void> {
    const filePath = this.getFilePath(type);
    const tempPath = `${filePath}.tmp`;

    // Atomic write: write to temp file, then rename
    await fs.writeFile(tempPath, JSON.stringify(entities, null, 2), 'utf-8');
    await fs.rename(tempPath, filePath);
  }

  async save(type: EntityType, entity: AnyEntity): Promise<AnyEntity> {
    // Validate with Zod
    const schema = SCHEMA_MAP[type];
    const validated = schema.parse(entity);

    // Add to cache
    const entities = this.cache.get(type) || [];
    entities.push(validated);
    this.cache.set(type, entities);

    // Write to disk
    await this.writeFile(type, entities);

    // Emit change event
    const event: StorageChangeEvent = {
      type: 'create',
      entity: type,
      data: validated,
    };
    this.emit('change', event);

    return validated;
  }

  async update(type: EntityType, id: string, partial: Partial<AnyEntity>): Promise<AnyEntity> {
    const entities = this.cache.get(type) || [];
    const index = entities.findIndex((e) => e.id === id);

    if (index === -1) {
      throw new Error(`Entity not found: ${type} with id ${id}`);
    }

    // Merge with existing entity
    const updated = { ...entities[index], ...partial, updated_at: new Date().toISOString() };

    // Validate
    const schema = SCHEMA_MAP[type];
    const validated = schema.parse(updated);

    // Update cache
    entities[index] = validated;
    this.cache.set(type, entities);

    // Write to disk
    await this.writeFile(type, entities);

    // Emit change event
    const event: StorageChangeEvent = {
      type: 'update',
      entity: type,
      data: validated,
    };
    this.emit('change', event);

    return validated;
  }

  async delete(type: EntityType, id: string): Promise<void> {
    const entities = this.cache.get(type) || [];
    const filtered = entities.filter((e) => e.id !== id);

    if (filtered.length === entities.length) {
      throw new Error(`Entity not found: ${type} with id ${id}`);
    }

    // Update cache
    this.cache.set(type, filtered);

    // Write to disk
    await this.writeFile(type, filtered);

    // Emit change event
    const event: StorageChangeEvent = {
      type: 'delete',
      entity: type,
      data: { id },
    };
    this.emit('change', event);
  }

  async get(type: EntityType, id: string): Promise<AnyEntity | undefined> {
    const entities = this.cache.get(type) || [];
    return entities.find((e) => e.id === id);
  }

  async getAll(type: EntityType): Promise<AnyEntity[]> {
    // Return from cache (already loaded during initialize)
    return this.cache.get(type) || [];
  }

  async clear(): Promise<void> {
    // Clear all entity types
    for (const type of ENTITY_TYPES) {
      // Get all entities for this type
      const entities = this.cache.get(type) || [];

      // Delete each entity to trigger proper events
      for (const entity of entities) {
        const event: StorageChangeEvent = {
          type: 'delete',
          entity: type,
          data: { id: entity.id },
        };
        this.emit('change', event);
      }

      // Clear cache
      this.cache.set(type, []);

      // Write empty array to disk
      await this.writeFile(type, []);
    }
  }
}
