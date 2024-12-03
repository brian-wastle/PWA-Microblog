import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PostService } from '../../services/post/post.service';
import { Post } from '../../models/post.model';
import { HeaderComponent } from '../../components/header/header.component';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import Swiper from 'swiper';
import { SwiperOptions } from 'swiper/types';
import { Subject, of } from 'rxjs';
import { debounceTime, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-homepage',
  imports: [CommonModule, InfiniteScrollDirective, LazyLoadImageModule, HeaderComponent],
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.scss'],
  standalone: true
})
export class HomepageComponent implements OnInit, AfterViewInit {
  posts: Post[] = [];
  page: number = 1;
  loading: boolean = false;
  hasMorePosts: boolean = true;
  private scrollSubject = new Subject<void>();

  scrollUpDistance = 2; // Scroll when 2% from top
  scrollDistance = 1;  // Scroll when 1% from bottom

  constructor(private postService: PostService) {}

  ngOnInit(): void {
    this.loadPosts();
  }

  ngAfterViewInit(): void {
    // Initialize Swiper after the view has been initialized
    const swiperOptions: SwiperOptions = {
      slidesPerView: 1,
      spaceBetween: 10,
      navigation: true,
      pagination: { clickable: true },
      loop: true
    };

    // Initialize Swiper for each swiper-container class (may be multiple)
    const swiperContainers = document.querySelectorAll('.swiper-container');
    swiperContainers.forEach((container) => {
      new Swiper(container as HTMLElement, swiperOptions);
    });
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

  // onScroll function remains intact
  onScroll(): void {
    this.scrollSubject.next();
  }
}
