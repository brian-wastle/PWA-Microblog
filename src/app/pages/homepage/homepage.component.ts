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
import { catchError } from 'rxjs/operators';




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
  private swiperInstances: Swiper[] = [];

  scrollUpDistance = 2; // Scroll when 2% from top
  scrollDistance = 1;  // Scroll when 1% from bottom

  constructor(private postService: PostService) {}
  
  ngOnInit(): void {
    this.loadPosts();
  }

  ngAfterViewInit(): void {
    // If initial posts are already loaded, initialize Swiper
    this.initializeSwipers();
  }

  loadPosts(): void {
    if (this.loading || !this.hasMorePosts) return;
    this.loading = true;

    this.postService.getPosts(/* ... */).subscribe((newPosts) => {
      this.posts = [...this.posts, ...newPosts];
      this.loading = false;
      this.hasMorePosts = newPosts.length > 0;
      
      // Re-initialize Swiper after new posts are rendered
      setTimeout(() => this.initializeSwipers());
    });
  }

  onScroll(): void {
    this.loadPosts();
  }

  private initializeSwipers(): void {
    // Destroy old instances first (to avoid duplicates)
    this.swiperInstances.forEach(instance => instance.destroy(true, true));
    this.swiperInstances = [];

    const swiperContainers = document.querySelectorAll('.swiper-container');
    swiperContainers.forEach((container) => {
      const swiper = new Swiper(container as HTMLElement, {
        slidesPerView: 1,
        spaceBetween: 10,
        navigation: true,
        pagination: { clickable: true },
        loop: true
      });
      this.swiperInstances.push(swiper);
    });
  }
}