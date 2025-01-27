import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Post } from '../../models/post.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PostService {
  private apiUrl = `${environment.API_URL}/viewPosts`;

  constructor(private http: HttpClient) { }

  getPosts(lastCreatedAt?: string | Date): Observable<Post[]> {
    let params = new HttpParams();
    
    if (lastCreatedAt) {
      // Convert Date to formatted string if necessary
      const formattedDate = lastCreatedAt instanceof Date
        ? lastCreatedAt.toISOString().replace('T', ' ').replace('Z', '').slice(0, 26)
        : lastCreatedAt.replace('T', ' ').replace('Z', '').slice(0, 26);
  
      params = params.set('lastCreatedAt', formattedDate);
    }
  
    return this.http.get<Post[]>(this.apiUrl, { params });
  }
}
