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

  constructor(private http: HttpClient) {}

  getPosts(lastCreatedAt?: string): Observable<Post[]> {
    let params = new HttpParams().set('limit', '10');

    if (lastCreatedAt) {
      params = params.set('lastCreatedAt', lastCreatedAt);
    }

    return this.http.get<Post[]>(this.apiUrl, { params });
  }
}
``
