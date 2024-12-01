import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Post } from '../../models/post.model';
import { PostService } from '../../services/post/post.service';
import { HeaderComponent } from '../../components/header/header.component';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { debounceTime, Subject, catchError, of } from 'rxjs';


@Component({
  selector: 'app-homepage',
  imports: [CommonModule, InfiniteScrollDirective, LazyLoadImageModule, HeaderComponent],
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.scss'],
  standalone: true
})
export class HomepageComponent implements OnInit {
  posts: Post[] = [];
  page: number = 1;
  loading: boolean = false;
  hasMorePosts: boolean = true;
  private scrollSubject = new Subject<void>();

  scrollUpDistance = 2; // Scroll when 2% from top
  scrollDistance = 1;  // Scroll when 1% from bottom

  constructor(private postService: PostService) {}

  ngOnInit(): void {
    this.scrollSubject.pipe(debounceTime(200)).subscribe(() => this.loadPosts());
    this.loadPosts();
  }

  loadPosts(): void {
    if (this.loading || !this.hasMorePosts) return;
    this.loading = true;
  
    this.postService.getPosts(this.page).pipe(
      catchError(error => {
        console.error('Error fetching posts:', error);
        this.loading = false;
        return of([]);
      })
    ).subscribe((newPosts) => {
      this.posts = [...this.posts, ...newPosts];
      this.page++;
      this.loading = false;
      this.hasMorePosts = newPosts.length > 0;
    });
  }
  

  onScroll(): void {
    this.scrollSubject.next();
  }
}
