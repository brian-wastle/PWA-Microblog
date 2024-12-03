import { Component, OnInit} from '@angular/core';
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
  postTypes: any[] = [
    { label: 'Text Post', value: 'text' },
    { label: 'Photo/Text Post', value: 'photoAlbum' },
    { label: 'Video/Text Post', value: 'video' }
  ];
  postForm: FormGroup;
  videoFile: File | null = null;
  mediaFiles: File[] = [];
  presignedUrls: any[] = [];
  uploadProgress: { [key: string]: number } = {}; 
  loading: boolean = false;

  constructor(private fb: FormBuilder, private http: HttpClient, private cognitoService: CognitoService) {
    this.postForm = this.fb.group({
      selectedPostType: ['text', Validators.required],
      postContent: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.postForm = this.fb.group({
      selectedPostType: ['text', Validators.required], 
      postContent: ['', Validators.required]
    });
  }

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
    inputFile.onchange = (event) => {
      if (inputFile.files) {
        this.mediaFiles.push(...Array.from(inputFile.files));
      }
    };
  }

  createPost() {
    if (this.postForm.valid) {
      this.loading = true;
      const { selectedPostType, postContent } = this.postForm.value;
  
      if (selectedPostType === 'text' && postContent.trim()) {
        // Handle text-only post
        console.log('Creating Text Post:', postContent);
        this.savePostToDB(selectedPostType, postContent, null, null);  // Save text post with no media
      } else if (selectedPostType === 'photoAlbum' && postContent.trim()) {
        // Handle photo album post
        console.log('Creating Photo/Text Post:', postContent);
        if (this.mediaFiles.length > 0) {
          this.uploadMediaToS3(this.mediaFiles); // Upload photos
        }
      } else if (selectedPostType === 'video' && postContent.trim()) {
        // Handle video post
        console.log('Creating Video/Text Post:', postContent);
        if (this.videoFile) {
          this.uploadVideoToS3(this.videoFile);
        } else {
          this.finalizePost();
        }
      }
    } else {
      console.error('Form is invalid. Please fill out all required fields.');
    }
  }

  finalizePost() {
    this.loading = false;
    console.log('Post creation finalized.');
  }

  async uploadMediaToS3(files: File[]) {
    try {
      const presignedUrls = await this.getPresignedURLs(files, 'photoAlbum');
      this.presignedUrls = presignedUrls;
      await Promise.all(
        files.map((file, index) =>
          this.uploadFileToS3(this.presignedUrls[index].signedUrl, file)
        )
      );
      this.finalizePost();
    } catch (error) {
      console.error('Error during media upload:', error);
      this.loading = false;
    }
  }

  async uploadVideoToS3(file: File) {
    try {
      const presignedUrls = await this.getPresignedURLs([file], 'video');
      this.presignedUrls = presignedUrls;
      await this.uploadFileToS3(this.presignedUrls[0].signedUrl, file);
      this.finalizePost();
    } catch (error) {
      console.error('Error during video upload:', error);
      this.loading = false;
    }
  }

  async getPresignedURLs(files: File[], postType: string): Promise<any[]> {
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
  
  // Upload file with presigned URL and track with .onprogress
  uploadFileToS3(signedUrl: string, file: File): Promise<void> {
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
          reject();
        }
      };

      xhr.onerror = () => {
        console.error(`Error uploading ${file.name}`);
        reject();
      };

      xhr.send(file);
    });
  }

  storeFinalURL(signedUrl: string, file: File) {
    const s3Url = signedUrl.split('?')[0]; // Remove the query parameters to get the final URL
    console.log('File URL:', s3Url);
  
    const postContent = this.postForm.get('postContent')?.value;
    const selectedPostType = this.postForm.get('selectedPostType')?.value;
  
    switch (selectedPostType) {
      case 'video':
        this.savePostToDB(selectedPostType, postContent, null, s3Url);
        break;
      case 'photoAlbum':
        this.savePostToDB(selectedPostType, postContent, [s3Url], null);
        break;
      case 'text':
        this.savePostToDB(selectedPostType, postContent, null, null);
        break;
      default:
        console.error('Unknown post type:', selectedPostType);
        break;
    }
  }

  savePostToDB(type: string, content: string, mediaUrls: string[] | null, videoUrl: string | null) {
    const postData = {
      type: type,
      content: content,
      mediaUrls: mediaUrls,
      videoUrl: videoUrl
    };
  
    const apiUrl = `${environment.API_URL}/createPost`; 
  
    const token = this.cognitoService.getAuthToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `${token}`
    });
  
    // Use HttpClient to send a POST request
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
