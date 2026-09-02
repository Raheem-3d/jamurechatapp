// app/api/upload/route.ts
// Requires Node.js server runtime (default) — not edge runtime
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import Busboy from "busboy";
import { Readable as NodeReadable } from "stream";
import cloudinary from "@/lib/cloudinary";

/* =========================================================================
 * [LOCAL STORAGE IMPORTS - COMMENTED OUT FOR FUTURE USE]
 * =========================================================================
 * import { mkdir } from "fs/promises";
 * import { createWriteStream } from "fs";
 * import { join, resolve } from "path";
 * ========================================================================= */

const MAX_FILES = 50;
const MAX_BYTES = 500 * 1024 * 1024; // 500MB per file for Cloudinary

// Route configuration for file uploads
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // up to 5 minutes for large uploads

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // Log request details for debugging
    const contentType = req.headers.get('content-type') || '';
    const contentLength = req.headers.get('content-length');
    console.log('Upload request received (Cloudinary):', {
      contentType,
      contentLength: contentLength ? `${(parseInt(contentLength) / 1024 / 1024).toFixed(2)}MB` : 'unknown',
      hasBody: !!req.body,
    });

    /* =========================================================================
     * [LOCAL STORAGE SETUP - COMMENTED OUT FOR FUTURE USE]
     * =========================================================================
     * const uploadsDir = resolve(process.cwd(), "public", "uploads");
     * await mkdir(uploadsDir, { recursive: true });
     * const origin = new URL('http://10.0.4.106:3000').origin;
     * ========================================================================= */

    // Fallback: handle raw binary uploads (application/octet-stream)
    if (contentType.startsWith('application/octet-stream')) {
      const body = req.body;
      if (!body) {
        return NextResponse.json({ success: false, message: 'No body' }, { status: 400 });
      }

      /* =========================================================================
       * [LOCAL STORAGE RAW UPLOAD - COMMENTED OUT FOR FUTURE USE]
       * =========================================================================
       * const localName = `${uuidv4()}.bin`;
       * const outPath = join(uploadsDir, localName);
       * const writeStream = createWriteStream(outPath, { flags: 'w' });
       * const nodeReadable = NodeReadable.fromWeb(body as any);
       * const writeDone = new Promise<void>((resolveWrite, rejectWrite) => {
       *   writeStream.on('finish', () => resolveWrite());
       *   writeStream.on('error', (err) => rejectWrite(err));
       * });
       * nodeReadable.pipe(writeStream);
       * await writeDone;
       * const fileUrl = `${origin}/u/${localName}`;
       * return NextResponse.json({ success: true, files: [{ fileUrl, fileName: null, fileType: 'application/octet-stream', localName, size: 0 }], failed: [] }, { status: 200 });
       * ========================================================================= */

      // Cloudinary Raw Upload
      const nodeReadable = NodeReadable.fromWeb(body as any);
      const uploadResult = await new Promise<any>((resolveUpload, rejectUpload) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: "auto",
            folder: "jamurechat/uploads",
          },
          (error, result) => {
            if (error) return rejectUpload(error);
            resolveUpload(result);
          }
        );
        nodeReadable.pipe(uploadStream);
      });

      const fileUrl = uploadResult.secure_url || uploadResult.url;
      return NextResponse.json({
        success: true,
        files: [{
          fileUrl,
          fileName: uploadResult.original_filename || null,
          fileType: uploadResult.format ? `${uploadResult.resource_type}/${uploadResult.format}` : 'application/octet-stream',
          localName: uploadResult.public_id,
          size: uploadResult.bytes || 0,
        }],
        failed: [],
      }, { status: 200 });
    }

    const files: Array<{ fileUrl: string; fileName: string; fileType: string | null; localName: string; size: number }> = [];
    const failed: Array<{ name: string; reason: string }> = [];
    const fileUploadPromises: Promise<void>[] = [];

    // Convert the Web ReadableStream to Node stream for Busboy
    const nodeReq = NodeReadable.fromWeb(req.body as any);
    (nodeReq as any).headers = { 'content-type': contentType };

    let bb: any;
    try {
      bb = Busboy({
        headers: (nodeReq as any).headers,
        limits: {
          files: MAX_FILES,
          fileSize: MAX_BYTES,
          parts: MAX_FILES + 10,
        },
        preservePath: true,
      });
    } catch (err: any) {
      console.error('Busboy init error:', err);
      return NextResponse.json({ success: false, message: 'Invalid multipart request', error: err?.message }, { status: 400 });
    }

    let fileCount = 0;
    let busboyErrorOccurred = false;
    let streamEnded = false;

    bb.on('file', (_fieldname: string, file: NodeJS.ReadableStream, info: { filename: string; mimeType: string }) => {
      if (streamEnded) {
        file.resume();
        return;
      }

      const { filename, mimeType } = info;
      fileCount += 1;
      if (fileCount > MAX_FILES) {
        failed.push({ name: filename, reason: `Too many files. Max ${MAX_FILES}` });
        file.resume();
        return;
      }

      /* =========================================================================
       * [LOCAL STORAGE FILE PIPING - COMMENTED OUT FOR FUTURE USE]
       * =========================================================================
       * const safeFilename = filename ? filename.replace(/[^a-zA-Z0-9._-]/g, '_') : 'file';
       * const ext = safeFilename && safeFilename.includes('.') ? safeFilename.split('.').pop()?.toLowerCase() ?? 'bin' : 'bin';
       * const localName = `${uuidv4()}.${ext}`;
       * const outPath = join(uploadsDir, localName);
       * const writeStream = createWriteStream(outPath, { flags: 'w' });
       * file.pipe(writeStream);
       * ========================================================================= */

      // Buffer file chunks in memory for Cloudinary upload
      const chunks: Buffer[] = [];
      let received = 0;
      let fileSizeExceeded = false;

      file.on('data', (data: Buffer) => {
        if (fileSizeExceeded) return;
        received += data.length;
        if (received > MAX_BYTES) {
          fileSizeExceeded = true;
          failed.push({ name: filename, reason: 'File exceeds Cloudinary upload limit' });
          file.resume();
        } else {
          chunks.push(data);
        }
      });

      file.on('error', (err: any) => {
        console.warn(`Error reading file ${filename}:`, err?.message);
        file.resume();
        if (!fileSizeExceeded) {
          failed.push({ name: filename, reason: err?.message || 'Read error' });
        }
      });

      const uploadPromise = new Promise<void>((resolveUpload) => {
        file.on('end', async () => {
          if (fileSizeExceeded) {
            resolveUpload();
            return;
          }

          try {
            const fileBuffer = Buffer.concat(chunks);
            
            // Cloudinary upload with resource_type: "auto"
            // This handles Images, PDFs, Audio, Video, and Docs automatically
            const result = await new Promise<any>((res, rej) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                {
                  resource_type: "auto",
                  folder: "jamurechat/uploads",
                  use_filename: true,
                  unique_filename: true,
                },
                (error, result) => {
                  if (error) return rej(error);
                  res(result);
                }
              );
              uploadStream.end(fileBuffer);
            });

            const fileUrl = result.secure_url || result.url;
            files.push({
              fileUrl,
              fileName: filename,
              fileType: mimeType || result.format ? `${result.resource_type}/${result.format}` : null,
              localName: result.public_id,
              size: result.bytes || received,
            });
            console.log('✅ Uploaded file to Cloudinary:', fileUrl, `(${(received / 1024 / 1024).toFixed(2)}MB)`);
          } catch (err: any) {
            console.error(`❌ Cloudinary upload error for ${filename}:`, err);
            failed.push({ name: filename, reason: err?.message || 'Cloudinary upload failed' });
          } finally {
            resolveUpload();
          }
        });
      });

      fileUploadPromises.push(uploadPromise);
    });

    bb.on('error', (err: any) => {
      console.error('Busboy error:', err?.message);
      busboyErrorOccurred = true;
      streamEnded = true;
      if (err?.message?.includes('Unexpected end of form')) {
        console.warn('Form parsing interrupted - likely network issue or truncated request');
      }
    });

    const finished = new Promise<void>((resolvePromise) => {
      const cleanup = () => {
        streamEnded = true;
        resolvePromise();
      };

      bb.on('finish', () => {
        console.log('Busboy finished successfully');
        cleanup();
      });

      bb.on('close', () => {
        console.log('Busboy stream closed');
        cleanup();
      });

      bb.on('error', (e: any) => {
        console.warn('Busboy stream error:', e?.message);
      });

      // Timeout fallback
      setTimeout(() => {
        if (!streamEnded) {
          console.warn('Busboy stream timeout - forcing completion');
          cleanup();
        }
      }, 285000);
    });

    nodeReq.on('error', (err: any) => {
      console.warn('Request stream error:', err?.message);
      streamEnded = true;
    });

    nodeReq.on('end', () => {
      console.log('Request stream ended');
    });

    // Start piping the request to Busboy
    nodeReq.pipe(bb);

    try {
      await finished;
      // Wait for all Cloudinary uploads to complete
      const results = await Promise.allSettled(fileUploadPromises);
      const rejected = results.filter(r => r.status === 'rejected');
      if (rejected.length > 0) {
        console.warn(`${rejected.length} file uploads failed`);
      }
    } catch (err) {
      console.warn('Stream processing error (continuing with partial results):', err);
    }

    if (files.length === 0 && failed.length === 0) {
      const message = busboyErrorOccurred
        ? 'Upload failed - possible network interruption. The request body may have been truncated.'
        : 'No file(s) provided';
      return NextResponse.json({ success: false, message }, { status: busboyErrorOccurred ? 422 : 400 });
    }

    // Deduplicate files by localName/public_id
    const uniqueFiles: typeof files = [];
    const seenLocalNames = new Set<string>();
    for (const file of files) {
      if (!seenLocalNames.has(file.localName)) {
        uniqueFiles.push(file);
        seenLocalNames.add(file.localName);
      }
    }

    const status = uniqueFiles.length > 0 ? 200 : 500;
    const success = uniqueFiles.length > 0 && failed.length === 0 ? true : uniqueFiles.length > 0;

    const responseData: any = { success, files: uniqueFiles, failed };
    if (busboyErrorOccurred && uniqueFiles.length > 0) {
      responseData.warning = 'Some files may have been incomplete due to network issues';
    }

    console.log('📤 Upload response:', {
      status,
      success,
      filesCount: uniqueFiles.length,
      failedCount: failed.length,
      files: uniqueFiles.map(f => ({ fileName: f.fileName, size: f.size, url: f.fileUrl }))
    });

    return NextResponse.json(responseData, { status });
  } catch (error) {
    console.error("Error uploading files:", error);
    return NextResponse.json({ message: "Something went wrong", error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
