import { Component, OnInit, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PostService } from '../../services/post/post.service';
import { Post } from '../../models/post.model';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import Swiper from 'swiper';

@Component({
  selector: 'app-homepage',
  imports: [CommonModule, InfiniteScrollDirective, LazyLoadImageModule],
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.scss'],
  standalone: true
})

export class HomepageComponent implements OnInit, AfterViewChecked {
  posts: Post[] = [];
  loading: boolean = false;
  hasMorePosts: boolean = true;
  private swiperInstances: Swiper[] = [];
  private isSwiperInitialized = false;

  scrollUpDistance = 2; // Scroll when 2% from top
  scrollDistance = 1;  // Scroll when 1% from bottom

  constructor(
    private postService: PostService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadPosts();
  }

  ngAfterViewChecked(): void {
    if (!this.isSwiperInitialized && this.posts.length > 0) {
      this.initializeSwipers();
      this.isSwiperInitialized = true; // Prevent redundant initialization
    }
  }

  loadPosts(): void {
    if (this.loading || !this.hasMorePosts) return;
    this.loading = true;

    const lastCreatedAt = this.posts.length > 0
      ? new Date(this.posts[this.posts.length - 1].createdAt).toISOString()
      : undefined;

    this.postService.getPosts(lastCreatedAt).subscribe((newPosts) => {
      const processedPosts = newPosts.map(post => ({
        ...post,
        createdAt: new Date(post.createdAt),
      }));

      this.posts = [...this.posts, ...processedPosts];
      console.log("this.posts: ", this.posts);
      this.loading = false;
      this.hasMorePosts = newPosts.length > 0;

      this.isSwiperInitialized = false;
      this.cdr.detectChanges();
    });
  }

  onScroll(): void {
    console.log("Scroll event activated");
    this.loadPosts();
  }

  private initializeSwipers(): void {
    this.swiperInstances.forEach(instance => instance.destroy(true, true));
    this.swiperInstances = [];

    const swiperContainers = document.querySelectorAll('.swiper-container');
    swiperContainers.forEach((container) => {
      const swiper = new Swiper(container as HTMLElement, {
        slidesPerView: 1,
        spaceBetween: 10,
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev'
        },
        pagination: { clickable: true },
        loop: true
      });
      this.swiperInstances.push(swiper);
    });

    console.log("Swiper instances initialized:", this.swiperInstances.length);
  }
}