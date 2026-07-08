/**
 * Duplication Analyzer
 * Detects code duplication
 */

import fs from "fs/promises";
import type { RepositoryContext, Finding } from "../../core/types.js";

export class DuplicationAnalyzer {
  private readonly SIMILARITY_THRESHOLD = 0.8;
  private readonly MIN_BLOCK_SIZE = 5;

  async analyze(context: RepositoryContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Collect code blocks from all files
    const codeBlocks = await this.collectCodeBlocks(context);

    // Find duplicates
    const duplicates = this.findDuplicates(codeBlocks);

    for (const duplicate of duplicates) {
      findings.push(this.createFinding(duplicate));
    }

    return findings;
  }

  private async collectCodeBlocks(context: RepositoryContext): Promise<Array<{
    file: string;
    line: number;
    content: string;
  }>> {
    const blocks: Array<{
      file: string;
      line: number;
      content: string;
    }> = [];

    for (const file of context.files) {
      try {
        const content = await fs.readFile(file.absolutePath, "utf-8");
        const lines = content.split("\n");

        // Collect blocks of code
        for (let i = 0; i < lines.length - this.MIN_BLOCK_SIZE; i++) {
          const block = lines.slice(i, i + this.MIN_BLOCK_SIZE).join("\n");
          blocks.push({
            file: file.path,
            line: i + 1,
            content: block,
          });
        }
      } catch (error) {
        console.warn(`Failed to read ${file.path} for duplication analysis`);
      }
    }

    return blocks;
  }

  private findDuplicates(blocks: Array<{
    file: string;
    line: number;
    content: string;
  }>): Array<{
    file1: string;
    line1: number;
    file2: string;
    line2: number;
    similarity: number;
  }> {
    const duplicates: Array<{
      file1: string;
      line1: number;
      file2: string;
      line2: number;
      similarity: number;
    }> = [];

    // Compare each block with every other block
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const block1 = blocks[i];
        const block2 = blocks[j];

        // Skip if from same file and close to each other
        if (block1.file === block2.file && Math.abs(block1.line - block2.line) < 10) {
          continue;
        }

        const similarity = this.calculateSimilarity(block1.content, block2.content);

        if (similarity >= this.SIMILARITY_THRESHOLD) {
          duplicates.push({
            file1: block1.file,
            line1: block1.line,
            file2: block2.file,
            line2: block2.line,
            similarity,
          });
        }
      }
    }

    return duplicates;
  }

  private calculateSimilarity(content1: string, content2: string): number {
    // Simple similarity calculation using character overlap
    const set1 = new Set(content1.toLowerCase().replace(/\s/g, ""));
    const set2 = new Set(content2.toLowerCase().replace(/\s/g, ""));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;

    return intersection.size / union.size;
  }

  private createFinding(duplicate: {
    file1: string;
    line1: number;
    file2: string;
    line2: number;
    similarity: number;
  }): Finding {
    return {
      id: `code-duplication-${duplicate.file1}-${duplicate.file2}`,
      type: "CODE-DUPLICATION",
      severity: "low",
      score: 30,
      file: duplicate.file1,
      line: duplicate.line1,
      message: "Code duplication detected",
      description: `Similar code found in ${duplicate.file1}:${duplicate.line1} and ${duplicate.file2}:${duplicate.line2} (${Math.round(duplicate.similarity * 100)}% similar)`,
      suggestion: "Extract duplicated code into reusable functions or modules",
      category: "maintainability",
    };
  }
}
