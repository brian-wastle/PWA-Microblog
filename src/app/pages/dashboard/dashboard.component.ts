import { Component, OnInit} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { ProgressBarModule } from 'primeng/progressbar';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CognitoService } from '../../services/cognito/cognito.service';
import { firstValueFrom } from 'rxjs';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    SelectButtonModule,
    InputTextareaModule,
    ButtonModule,
    ProgressBarModule,
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
  uploadProgress: { [key: string]: number } = {}; // Track progress by file name

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

  onVideoFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.videoFile = file;
    }
  }

  onMediaFilesSelected(event: any) {
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
      const { selectedPostType, postContent } = this.postForm.value;

      if (selectedPostType === 'text' && postContent.trim()) {
        console.log('Creating Text Post:', postContent);
      } else if (selectedPostType === 'photoAlbum' && postContent.trim()) {
        console.log('Creating Photo/Text Post:', postContent);
        if (this.mediaFiles.length > 0) {
          this.uploadMediaToS3(this.mediaFiles); // Upload photos
        }
      } else if (selectedPostType === 'video' && postContent.trim()) {
        console.log('Creating Video/Text Post:', postContent);
        if (this.videoFile) {
          this.uploadVideoToS3(this.videoFile); // Upload video
        }
      }
    } else {
      console.error('Form is invalid. Please fill out all required fields.');
    }
  }

  // Upload media (photos or video) to S3
  uploadMediaToS3(files: File[]) {
    this.getPresignedUrlsFromBackend(files, 'photoAlbum')
      .then((presignedUrls) => {
        this.presignedUrls = presignedUrls;
        files.forEach((file, index) => {
          this.uploadFileToS3(this.presignedUrls[index].signedUrl, file);
        });
      })
      .catch((error) => {
        console.error('Error getting presigned URLs:', error);
      });
  }

  uploadVideoToS3(file: File) {
    this.getPresignedUrlsFromBackend([file], 'video')
      .then((presignedUrls) => {
        this.presignedUrls = presignedUrls;
        this.uploadFileToS3(this.presignedUrls[0].signedUrl, file);
      })
      .catch((error) => {
        console.error('Error getting presigned URLs:', error);
      });
  }

  // Get presigned URLs from backend
  async getPresignedUrlsFromBackend(files: File[], postType: string): Promise<any[]> {
    const fileNames = files.map(file => file.name);
  
    // Prepare the body of the request
    const body = {
      type: postType,
      content: this.postForm.get('postContent')?.value,
      mediaFiles: fileNames,
      videoFile: postType === 'video' ? files[0] : null
    };
  
    try {
      const token = this.cognitoService.getAuthToken();
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `${token}`
      });
      const response: any = await firstValueFrom(this.http.post<any>(`${environment.API_URL}/getPresignedURLs`, body, { headers }));
      return response.presignedUrls;
    } catch (error) {
      console.error('Error getting presigned URLs:', error);
      throw error;
    }
  }
  
  // Upload file to S3 using the presigned URL and track progress
  uploadFileToS3(signedUrl: string, file: File) {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl, true);

    // Track upload progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        this.uploadProgress[file.name] = progress;
      }
    };

    // Handle completion
    xhr.onload = () => {
      if (xhr.status === 200) {
        console.log(`${file.name} uploaded successfully`);
        // Capture the S3 URL once the upload is complete
        this.captureFileUrl(signedUrl, file);
      } else {
        console.error(`Failed to upload ${file.name}`);
      }
    };

    // Handle error
    xhr.onerror = () => {
      console.error(`Error uploading ${file.name}`);
    };

    xhr.send(file);
  }

  // Capture the uploaded file URL after upload is complete
  captureFileUrl(signedUrl: string, file: File) {
    const s3Url = signedUrl.split('?')[0]; // Remove the query parameters to get the final URL
    console.log('File URL:', s3Url);
    this.savePostToDatabase(s3Url, file.name);
  }

  // Save the post to the PostgreSQL database
  savePostToDatabase(fileUrl: string, fileName: string) {
    const postData = {
      content: this.postForm.get('postContent')?.value,
      fileUrl: fileUrl,
      fileName: fileName
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
        },
        error: (error) => {
          console.error('Error saving post to database:', error);
        }
      });
  }
}
