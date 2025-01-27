import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CognitoService } from '../../services/cognito/cognito.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  postTypes = [
    { label: 'Text Post', value: 'text' },
    { label: 'Photo/Text Post', value: 'photoAlbum' },
    { label: 'Video/Text Post', value: 'video' }
  ];
  postForm: FormGroup;
  videoFile: File | null = null;    // For single video
  mediaFiles: File[] = [];          // For multiple photos
  presignedUrls: any[] = [];
  uploadProgress: { [key: string]: number } = {};
  loading = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private cognitoService: CognitoService
  ) {
    this.postForm = this.fb.group({
      selectedPostType: ['text', Validators.required],
      postContent: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Re-initialize or add additional logic if needed
  }

  // EVENT HANDLERS

  onVideoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.videoFile = file;
    }
  }

  onMediaSelected(event: any) {
    this.mediaFiles = Array.from(event.target.files);
  }

  addMorePhotos() {
    const inputFile = document.createElement('input');
    inputFile.type = 'file';
    inputFile.accept = 'image/*';
    inputFile.multiple = true;
    inputFile.click();
    inputFile.onchange = () => {
      if (inputFile.files) {
        this.mediaFiles.push(...Array.from(inputFile.files));
      }
    };
  }


  // POST CREATION

  async createPost() {
    if (this.postForm.invalid) {
      console.error('Form is invalid. Please fill out all required fields.');
      return;
    }

    this.loading = true;
    const { selectedPostType, postContent } = this.postForm.value;

    // TEXT POST
    if (selectedPostType === 'text' && postContent.trim()) {
      console.log('Creating Text Post:', postContent);
      // No files needed, just save
      this.savePostToDB('text', postContent, null, null);
      return;
    }

    // PHOTO POST
    if (selectedPostType === 'photoAlbum' && postContent.trim()) {
      if (this.mediaFiles.length === 0) {
        // If no photos selected, treat as text or throw an error
        console.warn('No photos selected—saving as text only or handle accordingly');
        this.savePostToDB('photoAlbum', postContent, [], null);
      } else {
        // Upload multiple photos
        try {
          const uploadedUrls = await this.uploadFilesToS3('photoAlbum', this.mediaFiles);
          this.savePostToDB('photoAlbum', postContent, uploadedUrls, null);
        } catch (err) {
          console.error('Error uploading photos:', err);
          this.loading = false;
        }
      }
      return;
    }

    // VIDEO POST
    if (selectedPostType === 'video' && postContent.trim()) {
      if (!this.videoFile) {
        console.warn('No video selected—saving as text only or handle accordingly');
        this.savePostToDB('video', postContent, null, null);
      } else {
        // Upload single video
        try {
          const uploadedUrls = await this.uploadFilesToS3('video', [this.videoFile]);
          // We only have 1 URL in the array, so pass it as videoUrl
          this.savePostToDB('video', postContent, null, uploadedUrls[0]);
        } catch (err) {
          console.error('Error uploading video:', err);
          this.loading = false;
        }
      }
      return;
    }

    // If we get here, something is off
    console.error('Invalid post content or type');
    this.loading = false;
  }

  finalizePost() {
    this.loading = false;
    console.log('Post creation finalized.');
  }


  // S3 UPLOAD

  private async uploadFilesToS3(postType: 'photoAlbum' | 'video', files: File[]): Promise<string[]> {
    // 1) Get presigned URLs from the backend
    const presignedUrls = await this.getPresignedURLs(files, postType);
    this.presignedUrls = presignedUrls;

    // 2) Upload each file
    const uploadedUrls: string[] = [];
    await Promise.all(
      files.map((file, index) => {
        const { signedUrl } = presignedUrls[index];
        return this.uploadFileToS3(signedUrl, file).then(() => {
          const s3Url = signedUrl.split('?')[0];
          uploadedUrls.push(s3Url);
          console.log(`File uploaded: ${file.name} => ${s3Url}`);
        });
      })
    );

    return uploadedUrls;
  }


  // PRESIGNED URLs

  private async getPresignedURLs(files: File[], postType: string): Promise<any[]> {
    const fileNames = files.map(file => file.name);
    const body = {
      type: postType,
      content: this.postForm.get('postContent')?.value,
      mediaFiles: fileNames,
      videoFile: postType === 'video' ? files[0] : null
    };

    const token = this.cognitoService.getAuthToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `${token}`
    });

    const response: any = await firstValueFrom(
      this.http.post<any>(`${environment.API_URL}/getPresignedURLs`, body, { headers })
    );
    return response.presignedUrls;
  }


  // UPLOAD HELPER

  private uploadFileToS3(signedUrl: string, file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', signedUrl, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          this.uploadProgress[file.name] = progress;
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          console.log(`${file.name} uploaded successfully`);
          resolve();
        } else {
          console.error(`Failed to upload ${file.name}`);
          reject(`Failed to upload ${file.name}, status: ${xhr.status}`);
        }
      };

      xhr.onerror = () => {
        console.error(`Error uploading ${file.name}`);
        reject(`XHR error uploading ${file.name}`);
      };

      xhr.send(file);
    });
  }


  // DB HELPER

  private savePostToDB(
    type: string,
    content: string,
    mediaUrls: string[] | null,
    videoUrl: string | null
  ) {
    const postData = {
      type,
      content,
      mediaUrls,
      videoUrl
    };

    const apiUrl = `${environment.API_URL}/createPost`;
    const token = this.cognitoService.getAuthToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `${token}`
    });

    this.http.post(apiUrl, postData, { headers })
      .subscribe({
        next: (data) => {
          console.log('Post saved to database:', data);
          this.finalizePost();
        },
        error: (error) => {
          console.error('Error saving post to database:', error);
          this.loading = false;
        }
      });
  }
}
