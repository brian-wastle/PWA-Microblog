// post.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Post } from '../../models/post.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PostService {
  private apiUrl = environment.API_URL + '/viewPosts';

  constructor(private http: HttpClient) {}

  getPosts(page: number): Observable<Post[]> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', '10');

    return this.http.get<Post[]>(this.apiUrl, { params });
  }
}
