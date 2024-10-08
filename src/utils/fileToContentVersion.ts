/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { Connection } from '@salesforce/core';
import type { Record, SaveResult } from '@jsforce/jsforce-node';
import FormData from 'form-data';

export type ContentVersion = {
  Title: string;
  FileExtension: string;
  VersionData: string;
  /** this could be undefined outside of our narrow use case (created files) */
  ContentDocumentId: string;
} & Record;

type ContentVersionCreateRequest = {
  PathOnClient: string;
  Title?: string;
  CreatedDate?: string;
};

export async function file2CV(
  conn: Connection,
  filepath: string,
  title?: string,
  createdDate?: string
): Promise<ContentVersion> {
  const req: ContentVersionCreateRequest = {
    PathOnClient: filepath,
    Title: title,
    CreatedDate: createdDate,
  };

  const form = new FormData();
  form.append('VersionData', await readFile(filepath), { filename: title ?? basename(filepath) });
  form.append('entity_content', JSON.stringify(req), { contentType: 'application/json' });

  // POST the multipart form to Salesforce's API, can't use the normal "create" action because it doesn't support multipart
  const CV = await conn.request<SaveResult>({
    url: '/sobjects/ContentVersion',
    headers: { ...form.getHeaders() },
    body: form.getBuffer(),
    method: 'POST',
  });

  if (!CV.success) {
    throw new Error(`Failed to create ContentVersion: ${CV.errors.map((e) => JSON.stringify(e, null, 2)).join('\n')}`);
  }

  return conn.singleRecordQuery<ContentVersion>(
    `Select Id, ContentDocumentId, Title, FileExtension from ContentVersion where Id='${CV.id}'`
  );
}
