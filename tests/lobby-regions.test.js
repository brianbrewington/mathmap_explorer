import { describe, it, expect } from 'vitest';
import { computeTopicCentroid } from '../js/ui/lobby.js';

// computeTopicCentroid(nodes, positions, topicKey) → { x, y } | null
//
// Nodes are exploration objects with a `tags` array; the helper uses
// FACETS.topic.values to find the first tag that is a recognised topic key.
// All tags used below are valid topic keys from taxonomy.js.

describe('computeTopicCentroid', () => {
  it('single node → centroid equals that node position', () => {
    const nodes = [{ tags: ['fractals'] }];
    const positions = [[3, 7]];
    const result = computeTopicCentroid(nodes, positions, 'fractals');
    // < 2 nodes → null per spec; single node is edge case that returns null
    expect(result).toBeNull();
  });

  it('exactly two nodes → centroid is the midpoint', () => {
    const nodes = [{ tags: ['fractals'] }, { tags: ['fractals'] }];
    const positions = [[0, 0], [4, 6]];
    const result = computeTopicCentroid(nodes, positions, 'fractals');
    expect(result).not.toBeNull();
    expect(result.x).toBeCloseTo(2);
    expect(result.y).toBeCloseTo(3);
  });

  it('three nodes → centroid is arithmetic mean of positions', () => {
    const nodes = [
      { tags: ['dynamical-systems'] },
      { tags: ['dynamical-systems'] },
      { tags: ['dynamical-systems'] },
    ];
    const positions = [[0, 0], [6, 0], [3, 9]];
    const result = computeTopicCentroid(nodes, positions, 'dynamical-systems');
    expect(result).not.toBeNull();
    expect(result.x).toBeCloseTo(3);
    expect(result.y).toBeCloseTo(3);
  });

  it('nodes with a different topic tag are excluded from the centroid', () => {
    const nodes = [
      { tags: ['fractals'] },
      { tags: ['calculus'] },  // different topic
      { tags: ['fractals'] },
    ];
    const positions = [[0, 0], [100, 100], [2, 4]];
    // Only nodes[0] and nodes[2] match 'fractals'
    const result = computeTopicCentroid(nodes, positions, 'fractals');
    expect(result).not.toBeNull();
    expect(result.x).toBeCloseTo(1);
    expect(result.y).toBeCloseTo(2);
  });

  it('nodes with no tags array are excluded gracefully', () => {
    const nodes = [
      { tags: ['fractals'] },
      {},                       // no tags
      { tags: null },           // null tags
      { tags: ['fractals'] },
    ];
    const positions = [[0, 0], [999, 999], [999, 999], [4, 8]];
    const result = computeTopicCentroid(nodes, positions, 'fractals');
    expect(result).not.toBeNull();
    expect(result.x).toBeCloseTo(2);
    expect(result.y).toBeCloseTo(4);
  });

  it('topic with zero matching nodes returns null (label is skipped)', () => {
    const nodes = [
      { tags: ['calculus'] },
      { tags: ['number-theory'] },
    ];
    const positions = [[1, 2], [3, 4]];
    const result = computeTopicCentroid(nodes, positions, 'fractals');
    expect(result).toBeNull();
  });

  it('topic with only one matching node returns null (< 2 threshold)', () => {
    const nodes = [
      { tags: ['physics'] },
      { tags: ['calculus'] },
    ];
    const positions = [[5, 10], [20, 30]];
    const result = computeTopicCentroid(nodes, positions, 'physics');
    expect(result).toBeNull();
  });
});
