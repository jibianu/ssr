import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
@Component({
    selector: 'app-test-result',
    templateUrl: './test-result.component.html',
    styleUrls: ['./test-result.component.scss'],
    standalone: false
})
export class TestResultComponent implements OnInit {

  subscription: Subscription = new Subscription();
  questionSetDetails: any;
  questionSetID: any;
  userTestResponse: any;
  constructor(private appService: AdminAppService, private route: ActivatedRoute, private _location:Location) { 
      this.questionSetID = this.route.snapshot.params.questionSetID;
  }

  ngOnInit(): void {
    this.getTestsResult(this.questionSetID);
  }
  getTestsResult(id) {
    this.subscription.add(this.appService.getTestsResult(id).subscribe((res: any) => {
      if (res) {
        this.questionSetDetails = res.questionSetTestInformation[0];
        this.userTestResponse = res.userTestResponse;
      }
    }));
  }
  totalSecondToTime(totalSecond) {
    
    if(!totalSecond || totalSecond<1){
      return "00:00:00";
    }
    
    var hours = Math.floor(totalSecond / 3600);
    var minutes = Math.floor((totalSecond - (hours * 3600)) / 60);
    var seconds = totalSecond - (hours * 3600) - (minutes * 60);
    var result = (hours < 10 ? "0" + hours : hours);
    result += ":" + (minutes < 10 ? "0" + minutes : minutes);
    result += ":" + (seconds < 10 ? "0" + seconds : seconds);
    return result;
  }
  backPage(){
    this._location.back();
  }
}
