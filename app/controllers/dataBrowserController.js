'use strict';

app.controller('dataBrowserController',
function($scope, 
$rootScope,
$q,
$location,
$stateParams,
utilityService,
tableTypeService,
columnDataTypeService,
tableErrorService,
projectService,
tableService,     
$resource,
$timeout,
$filter,
focus,
beaconService) {

//Init
var id;
var tableName;
$scope.isTableLoaded=false;
$rootScope.isFullScreen=true; 

//Column specific
$scope.showColOptions=[];
$scope.showHiddenColList=false;
$scope.showAddColPopUp=false;
$scope.hideColumn=[];
$scope.editColumn=[];

/***Errors,Spinners,Warnings,SavedTick***/
//Array Types
$scope.rowEditMode=[];
$scope.rowWarningMode=[];
$scope.rowErrorMode=[];
$scope.rowSpinnerMode=[]; 
$scope.rowSavedMode=[];
$scope.showSerialNo=[];
$scope.holdeSerialNoInfo=[];
$scope.rowsSelected=[];

//Simple dataTypes
$scope.commonSpinner=false;
$scope.commonSaved=false;
$scope.commonError=null;
$scope.commonWarning=null;

$scope.selectedRowsCount=0;
$scope.areSelectAllRows=false; 
$scope.rowInfo=null;
/***Errors,Spinners,Warnings,SavedTick***/

//Field Ediatble
$scope.showInputForEdit=[[]]; 
$scope.editableField=[[]];
$scope.holdFieldData=[[]];
$scope.newListItem=null;

//Relation  
$scope.relatedTableDefArray=[];
$scope.relatedTableRecordArray=[];
$scope.relationError=[];
$scope.relationHoldData=[];
$scope.relationShowInput=[]; 
$scope.setRelFileError=[]; 
$scope.setRelFileSpinner=[];
$scope.viewRelDataError=[];

//Random
$scope.isFileSelected=false;  
$scope.currentTableData=[]; 
$scope.modifyListItemError=[];
$scope.listFileSpinner=[];
$scope.listFileError=[];
$scope.orderBy="createdAt"; 
$scope.orderByType="asc";
$scope.hiddenColumnCount=0;
$scope.addACL=[];
$scope.newACLSpinner=false;
$scope.userRecords=[];
$scope.roleRecords=[];
$scope.aclPublic={
  id:"all",
  name:"Public",
  icon:"ion-person-stalker",
  player:"User",
  readValue:null,
  writeValue:null
};
$scope.relFileProgress=null;

$scope.init = function() { 
  id = $stateParams.appId;
  tableName= $stateParams.tableName;
  $scope.colDataTypes=columnDataTypeService.getcolumnDataTypes();
  if(id && tableName){        
    loadProject(id);                   
  }

  //get beacon
  getBeacon();     
};

$scope.loadTableData = function(t,orderBy,orderByType,limit,skip) {          
  var q=$q.defer();
  if(t){   
      var query = new CB.CloudQuery(t.name);

      if(orderByType=="asc"){
        query.orderByAsc(orderBy);
      }
      if(orderByType=="desc"){
        query.orderByDesc(orderBy);
      }
        
      query.setLimit(limit);
      query.setSkip(skip);

      for(var i=0;i<t.columns.length;++i){
        if(t.columns[i].dataType=="File"){
          query.include(t.columns[i].name);
        }        
      } 

      query.find({success : function(list){ 
        q.resolve(list);
      }, error : function(error){ 
        q.reject(error);             
      }});       
  }                  
  return  q.promise;     
};

$scope.queryTableById = function(table,objectId) {          
  var q=$q.defer();
    
    var query = new CB.CloudQuery(table.name); 
    for(var i=0;i<table.columns.length;++i){
      if(table.columns[i].dataType=="File"){
        query.include(table.columns[i].name);
      }else if(table.columns[i].dataType=="List" && table.columns[i].document.relatedTo!='Text' && table.columns[i].document.relatedTo!='EncryptedText' && table.columns[i].document.relatedTo!='Email' && table.columns[i].document.relatedTo!='Number' && table.columns[i].document.relatedTo!='URL' && table.columns[i].document.relatedTo!='DateTime' && table.columns[i].document.relatedTo!='Boolean' && table.columns[i].document.relatedTo!='File' && table.columns[i].document.relatedTo!='Object' && table.columns[i].document.relatedTo!='GeoPoint'){
        query.include(table.columns[i].name);
      }
    }

    query.findById(objectId,{
    success : function(record){ 
       q.resolve(record);                 

    }, error : function(error){                
       q.reject(error);
    }}); 

  return  q.promise;           
}; 

$scope.queryTableByName = function(tableName) {          
  var q=$q.defer();
    
    var query = new CB.CloudQuery(tableName);       
    query.find({
    success : function(records){ 
      q.resolve(records);                 

    }, error : function(error){                
      q.reject(error);
    }}); 

  return  q.promise;           
};

//Save Boolean
$scope.setAndSaveBoolean=function(row,column){
  var i=$scope.currentTableData.indexOf(row);   
  rowEditMode(i);
 
  var requiredField = _.find($scope.currentProject.currentTable.columns, function(everyCol){
     if(everyCol.name!=column.name && everyCol.name!="id" && everyCol.name!="createdAt" && everyCol.name!="updatedAt" && everyCol.name!="ACL" && everyCol.required){
       if(!row.get(everyCol.name)){
        return everyCol;
       }          
     }
  });
   row.set(column.name,!row.get(column.name));
  if(requiredField){      
    rowWarningMode(i,row,column.name);     
  }else{
    rowSpinnerMode(i);     

    //Save Cloud Object
    $scope.saveCloudObject(row)
    .then(function(obj){
        //scope.$digest();         
        if($scope.tableDef){
          convertISO2DateObj($scope.tableDef,obj);
        }
        showSaveIconInSecond(i);

    }, function(error){ 
       rowErrorMode(i,error);    
    });
  }       
  
};
//End Boolean 

//Invoke Common Type Input enable
$scope.showCommonTypes=function(row,column){
  nullifyFields();
  $scope.editableRow=row;//row
  $scope.editableColumnName=column.name;//column name 
  $scope.editableColumn=column;
  $scope.editableIndex=$scope.currentTableData.indexOf(row);//index      

  //Show INPUT Box to Edit for Commong DataTypes
  if(column.document.dataType!="Object" && column.document.dataType!="ACL" && column.document.dataType!="File" && column.document.dataType!="GeoPoint" && column.document.dataType!="List"){
    var arry=[column.name];
    var arry2=[column.name];
    var arry3=[column.name];
    var index=angular.copy($scope.editableIndex);

    //Enable column to edit         
    $scope.showInputForEdit[index]=arry;
    $scope.showInputForEdit[index][column.name]=true;

    $scope.editableField[index]=arry2;
    $scope.holdFieldData[index]=arry3;
  }

  //Set Field or value      
  if(column.document.dataType=="EncryptedText"){ 
    $scope.holdFieldData[index][column.name]=angular.copy(row.get(column.name));     
    $scope.editableField[index][column.name]=null;

  }else if(column.document.dataType=="DateTime"){
    $scope.editableField[index][column.name]=angular.copy(new Date(row.get(column.name)));     
  }else if(column.dataType=="Object"){

    $scope.editableJsonObj=angular.copy(row.get(column.name));   
    if(!row.get(column.name)){
      $scope.editableJsonObj=null;
    }          
    $scope.editableJsonObj =JSON.stringify($scope.editableJsonObj,null,2);            
    $("#md-objectviewer").modal();  

  }else if(column.dataType=="ACL"){

    $scope.editableJsonObj=angular.copy(row.get(column.name));   
    if(!row.get(column.name)){
      $scope.editableJsonObj=null;
    }
    if($scope.editableJsonObj){      

        
        prepareACLDisplay($scope.editableJsonObj);
        $scope.addACL=[];
        $scope.aclUsers=[];
        $scope.aclRoles=[];
        $scope.aclPublic={
          id:"all",
          name:"Public",
          icon:"ion-person-stalker",
          player:"User",
          readValue:null,
          writeValue:null
        };

        //Getting Users For Autocomplete
        $scope.queryTableByName("User")
        .then(function(userRecords){         
          $scope.userRecords=userRecords;        
        },function(error){         
        });

        //Getting Roles For Autocomplete
        $scope.queryTableByName("Role")
        .then(function(roleRecords){         
          $scope.roleRecords=roleRecords;  
        },function(error){ 
        });       
    }    

  }else if(column.document.dataType=="File"){

    $scope.editableFile=angular.copy(row.get(column.name));
    $("#md-fileviewer").modal();

  }else if(column.document.dataType=="GeoPoint"){

    $scope.editableGeopoint=angular.copy(row.get(column.name));   
    if(!row.get(column.name)){
      $scope.editableGeopoint={};     
      $scope.editableGeopoint.latitude=null;
      $scope.editableGeopoint.longitude=null;
    }
    $("#md-geodocumentviewer").modal();

  }else if(column.document.dataType=="List"){ 
    $scope.newListItem=null;
    $scope.addListItemError=null; 
    clearListErrors();   
    $scope.editableList=angular.copy(row.get(column.name));
  
    if(column.relatedTo=="DateTime"){    
      convertFieldsISO2DateObj(); 
    } 
    if((!$scope.editableList || $scope.editableList.length==0) && column.relatedTo!='Text' && column.relatedTo!='Email' && column.relatedTo!='URL' && column.relatedTo!='Number' && column.relatedTo!='DateTime' && column.relatedTo!='Object' && column.relatedTo!='Boolean' && column.relatedTo!='File' && column.relatedTo!='GeoPoint'){      
      $("#md-list-commontypes").modal();
      $scope.listSearchRelationDocs(); 
    }else if(($scope.editableList && $scope.editableList.length>0) && column.relatedTo!='Text' && column.relatedTo!='Email' && column.relatedTo!='URL' && column.relatedTo!='Number' && column.relatedTo!='DateTime' && column.relatedTo!='Object' && column.relatedTo!='Boolean' && column.relatedTo!='File' && column.relatedTo!='GeoPoint'){
      var cbIdArray=[];
      for(var j=0;j<$scope.editableList.length;++j){
        cbIdArray.push($scope.editableList[j].get("id"));
      }

      //Array CloudObjects
      var query = new CB.CloudQuery(column.document.relatedTo);      
      query.containedIn('id', cbIdArray);
      query.find({
        success: function(list){
          if(list && list.length>0){
            $scope.editableList=list;
            $scope.$digest();
          }else{
            $scope.editableList=null;
            $scope.$digest();
          }          
          $("#md-list-commontypes").modal();          
        },
        error: function(err) {
          $scope.editableList=null;
          $("#md-list-commontypes").modal();
        }
      });
      //Array CloudObjects
      
    }else{
      $("#md-list-commontypes").modal();
    }

  }else{
    $scope.editableField[index][column.name]=angular.copy(row.get(column.name));      
  }

  //Focus INPUT Box to Edit for Commong DataTypes
  if(column.document.dataType!="Object" && column.document.dataType!="ACL" && column.document.dataType!="File" && column.document.dataType!="GeoPoint" && column.document.dataType!="List"){
    focus(column.id+"column"); 
  }             
};
//End Text

function prepareACLDisplay(aclObject){
  $scope.aclRoles=[]; 
  $scope.aclUsers=[]; 

  //Role   
  var rolePromise=[];
  rolePromise.push(createACL("Role",aclObject.document.read.allow.role,"read","allow"));
  rolePromise.push(createACL("Role",aclObject.document.read.deny.role,"read","deny"));

  rolePromise.push(createACL("Role",aclObject.document.write.allow.role,"write","allow"));
  rolePromise.push(createACL("Role",aclObject.document.write.deny.role,"write","deny"));

  $q.all(rolePromise).then(function(dList){
    var readRoles=[];
    var writeRoles=[];

    if(dList[0].length>0){
      readRoles=dList[0]; 
    }
    if(dList[1].length>0){
      if(readRoles.length>0){
        readRoles=roles.concat(dList[1]); 
      }else{
        readRoles=dList[1];
      } 
    }

    if(dList[2].length>0){
      writeRoles=dList[2]; 
    }
    if(dList[3].length>0){
      if(writeRoles.length>0){
        writeRoles=roles.concat(dList[3]); 
      }else{
        writeRoles=dList[3];
      } 
    }
    
    for(var i=0;i<readRoles.length;++i){
      for(var j=0;j<writeRoles.length;++j){
        if(readRoles[i].id==writeRoles[j].id){
          readRoles[i].writeValue=writeRoles[j].writeValue;
          writeRoles.splice(j,1);
        }
      }
    }    

    $scope.aclRoles=readRoles.concat(writeRoles);
  },function(){
  });

  //User   
  var userPromise=[];
  userPromise.push(createACL("User",aclObject.document.read.allow.user,"read","allow"));
  userPromise.push(createACL("User",aclObject.document.read.deny.user,"read","deny"));

  userPromise.push(createACL("User",aclObject.document.write.allow.user,"write","allow"));
  userPromise.push(createACL("User",aclObject.document.write.deny.user,"write","deny"));

  $q.all(userPromise).then(function(dList){
    var readUsers=[];
    var writeUsers=[];

    if(dList[0].length>0){
      readUsers=dList[0]; 
    }
    if(dList[1].length>0){
      if(readUsers.length>0){
        readUsers=roles.concat(dList[1]); 
      }else{
        readUsers=dList[1];
      } 
    }

    if(dList[2].length>0){
      writeUsers=dList[2]; 
    }
    if(dList[3].length>0){
      if(writeUsers.length>0){
        writeUsers=roles.concat(dList[3]); 
      }else{
        writeUsers=dList[3];
      } 
    }

    if(readUsers.length>0){
      for(var i=0;i<readUsers.length;++i){
        if(writeUsers.length>0){
          for(var j=0;j<writeUsers.length;++j){
            if(readUsers[i].id==writeUsers[j].id){
              readUsers[i].writeValue=writeUsers[j].writeValue;
              //Special case (Public)          
              if(readUsers[i].id==writeUsers[j].id && readUsers[i].id=="all"){
                $scope.aclPublic.readValue=readUsers[i].readValue;
                $scope.aclPublic.writeValue=readUsers[i].writeValue;
              }
              writeUsers.splice(j,1);
            }          
          }
        }else{
          //Special case (Public) 
          if(readUsers[i].id=="all"){
            $scope.aclPublic.readValue=readUsers[i].readValue;
            $scope.aclPublic.writeValue=null;
          }          
        }
        
      }
    }else if(writeUsers.length>0){
      for(var j=0;j<writeUsers.length;++j){            
        //Special case (Public)          
        if(writeUsers[j].id=="all"){
          $scope.aclPublic.readValue=null;
          $scope.aclPublic.writeValue=writeUsers[j].writeValue;
        }                  
      } 
    }
    

    $scope.aclUsers=readUsers.concat(writeUsers);
    if($scope.editableJsonObj){
      $("#md-aclviewer").modal();  
    }else if($scope.relEditableJsonObj){
      $("#md-rel-aclviewer").modal("show");
    }    
  },function(){
  });

}

function createACL(tableName,array,readOrWrite,permission){
  var q=$q.defer();
  var returnList=[];

  if(array.length>0){
    var promises=[];
    for(var i=0;i<array.length;++i){
      if(tableName,array[i]!="all"){
        var tableDef= _.first(_.where($rootScope.currentProject.tables, {name: tableName})); 
        promises.push($scope.queryTableById(tableDef,array[i]));
      }else if(array[i]=="all"){         

          var jsonObj={};
          jsonObj.id=array[i];                 
          jsonObj.name="Public";
          jsonObj.player=tableName;
          
          jsonObj.readValue=null;
          jsonObj.writeValue=null;
          
          if(readOrWrite=="read" && permission=="allow"){  
            jsonObj.readValue=true;                    
          }else if(readOrWrite=="read" && permission=="deny"){  
            jsonObj.readValue=false;                     
          } 

          if(readOrWrite=="write" && permission=="allow"){  
            jsonObj.writeValue=true;                     
          }else if(readOrWrite=="write" && permission=="deny"){  
            jsonObj.writeValue=false;                         
          }    

          if(tableName=="Role"){
            jsonObj.icon="ion-unlocked";
          }else if(tableName=="User"){
            jsonObj.icon="ion-person-stalker"; 
            $scope.aclPublic.icon="ion-person-stalker";   
          }     

          returnList.push(jsonObj);      
      }      
    }

    if(promises.length>0){
      $q.all(promises).then(function(list){
        

        for(var i=0;i<array.length;++i){
          var jsonObj={};
          jsonObj.id=array[i];          

          if(tableName=="Role"){
            jsonObj.name=list[i].get("name");
          }else if(tableName=="User"){
            jsonObj.name=list[i].get("username"); 
          }

          jsonObj.player=tableName;
          
          jsonObj.readValue=null;
          jsonObj.writeValue=null;

          
          if(readOrWrite=="read" && permission=="allow"){  
            jsonObj.readValue=true;         
          }else if(readOrWrite=="read" && permission=="deny"){  
            jsonObj.readValue=false;            
          } 

          if(readOrWrite=="write" && permission=="allow"){  
            jsonObj.writeValue=true;         
          }else if(readOrWrite=="write" && permission=="deny"){  
            jsonObj.writeValue=false;            
          }    

          if(tableName=="Role"){
            jsonObj.icon="ion-unlocked";
          }else if(tableName=="User"){
            jsonObj.icon="ion-person-stalker";  
          }     

          returnList.push(jsonObj);        
        }
        q.resolve(returnList);
      },function(error){
        q.reject(error);
      });

    }else{
      q.resolve(returnList);
    }
      
  }else{   
    q.resolve(returnList);
  } 

  return  q.promise; 
}

$scope.changeACL=function(player,settingName,bool,playerId,arrayName){
  if(arrayName=="newacl"){
    for(var i=0;i<$scope.addACL.length;++i){
      if($scope.addACL[i].id==playerId){
        if(settingName=="read"){
          $scope.addACL[i].read=bool;
        }else if(settingName=="write"){
          $scope.addACL[i].write=bool;
        }
      }
    }
  }else if(arrayName=="user"){
    for(var i=0;i<$scope.aclUsers.length;++i){
      if($scope.aclUsers[i].id==playerId){
        if(settingName=="read"){
          $scope.aclUsers[i].readValue=bool;
        }else if(settingName=="write"){
          $scope.aclUsers[i].writeValue=bool;
        }
      }
      
    }

    //Public ACL
    if(playerId=="all"){
      if(settingName=="read"){
        $scope.aclPublic.readValue=bool;
      }else if(settingName=="write"){
        $scope.aclPublic.writeValue=bool;
      }
    }

  }else if(arrayName=="role"){
    for(var i=0;i<$scope.aclRoles.length;++i){
      if($scope.aclRoles[i].id==playerId){
        if(settingName=="read"){
          $scope.aclRoles[i].readValue=bool;
        }else if(settingName=="write"){
          $scope.aclRoles[i].writeValue=bool;
        }
      }
    }
  }

  if($scope.editableRow && $scope.editableJsonObj){
    $scope.setACL(player,settingName,bool,playerId,$scope.editableRow);  
  }else if($scope.relEditableRow && $scope.relEditableJsonObj){
    $scope.setACL(player,settingName,bool,playerId,$scope.relEditableRow); 
  }
    
};

$scope.setACL=function(player,settingName,bool,playerId,cloudObject){  
  //User
  if(player=="User"){    
    //$scope.editableRow.ACL = new CB.ACL(); 
    if(settingName=="read"){
      if(bool==true || bool==false){
        cloudObject.ACL.setUserReadAccess(playerId,bool);
      }else if(bool==null){
        var allowIndex=cloudObject.get("ACL").document.read.allow.user.indexOf(playerId);
        if(allowIndex>-1){
          cloudObject.get("ACL").document.read.allow.user.splice(allowIndex,1);
        } 
        var denyIndex=cloudObject.get("ACL").document.read.deny.user.indexOf(playerId);
        if(denyIndex>-1){
          cloudObject.get("ACL").document.read.deny.user.splice(denyIndex,1);
        }       
      }
      
    }
    if(settingName=="write"){      
      if(bool==true || bool==false){
        cloudObject.ACL.setUserWriteAccess(playerId,bool);
      }else if(bool==null){
        var allowIndex=cloudObject.get("ACL").document.write.allow.user.indexOf(playerId);
        if(allowIndex>-1){
          cloudObject.get("ACL").document.write.allow.user.splice(allowIndex,1);
        } 
        var denyIndex=cloudObject.get("ACL").document.write.deny.user.indexOf(playerId);
        if(denyIndex>-1){
          cloudObject.get("ACL").document.write.deny.user.splice(denyIndex,1);
        }
      }
    }
  }  

  //Role
  if(player=="Role"){    
    //$scope.editableRow.ACL = new CB.ACL(); 
    if(settingName=="read"){
      if(bool==true || bool==false){
        cloudObject.ACL.setRoleReadAccess(playerId,bool);
      }else if(bool==null){
        var allowIndex=cloudObject.get("ACL").document.read.allow.role.indexOf(playerId);
        if(allowIndex>-1){
          cloudObject.get("ACL").document.read.allow.role.splice(allowIndex,1);
        } 
        var denyIndex=cloudObject.get("ACL").document.read.deny.role.indexOf(playerId);
        if(denyIndex>-1){
          cloudObject.get("ACL").document.read.deny.role.splice(denyIndex,1);
        }       
      }
      
    }
    if(settingName=="write"){      
      if(bool==true || bool==false){
        cloudObject.ACL.setRoleWriteAccess(playerId,bool);
      }else if(bool==null){
        var allowIndex=cloudObject.get("ACL").document.write.allow.role.indexOf(playerId);
        if(allowIndex>-1){
          cloudObject.get("ACL").document.write.allow.role.splice(allowIndex,1);
        } 
        var denyIndex=cloudObject.get("ACL").document.write.deny.role.indexOf(playerId);
        if(denyIndex>-1){
          cloudObject.get("ACL").document.write.deny.role.splice(denyIndex,1);
        }
      }
    }
  }
    
};

$scope.removeACL=function(player,playerId,arrayName,cloudObject){

  if(arrayName=="newacl"){
    for(var i=0;i<$scope.addACL.length;++i){
      if($scope.addACL[i].id==playerId){
        $scope.addACL.splice(i,1);
      }
    }
  }else if(arrayName=="user"){
    for(var i=0;i<$scope.aclUsers.length;++i){
      if($scope.aclUsers[i].id==playerId){
        $scope.aclUsers.splice(i,1);
      }
    }

  }else if(arrayName=="role"){
    for(var i=0;i<$scope.aclRoles.length;++i){
      if($scope.aclRoles[i].id==playerId){
        $scope.aclRoles.splice(i,1);
      }
    }
  }

  if(player=="User"){
    var allowIndex=cloudObject.get("ACL").document.read.allow.user.indexOf(playerId);
    if(allowIndex>-1){
      cloudObject.get("ACL").document.read.allow.user.splice(allowIndex,1);
    } 
    var denyIndex=cloudObject.get("ACL").document.read.deny.user.indexOf(playerId);
    if(denyIndex>-1){
      cloudObject.get("ACL").document.read.deny.user.splice(denyIndex,1);
    }
  }  

  if(player=="Role"){
    var allowIndex=cloudObject.get("ACL").document.read.allow.role.indexOf(playerId);
    if(allowIndex>-1){
      cloudObject.get("ACL").document.read.allow.role.splice(allowIndex,1);
    } 
    var denyIndex=cloudObject.get("ACL").document.read.deny.role.indexOf(playerId);
    if(denyIndex>-1){
      cloudObject.get("ACL").document.read.deny.role.splice(denyIndex,1);
    }
  }  

  $("#acl-search-id").val(null);
};

$scope.deleteData=function(row,column){
  if(!column.required){
    nullifyFields();
    $scope.editableRow=row;//row
    $scope.editableColumnName=column.name;//column name 
    $scope.editableColumn=column;
    $scope.editableIndex=$scope.currentTableData.indexOf(row);//index
 
    //Show INPUT Box to Edit for Commong DataTypes
    if(column.document.dataType!="Object" && column.document.dataType!="ACL" && column.document.dataType!="File" && column.document.dataType!="GeoPoint" && column.document.dataType!="List"){
      $scope.nullAccepted=true;
      var arry2=[column.name];
      var index=angular.copy($scope.editableIndex);       

      $scope.editableField[index]=arry2;
      $scope.editableField[index][column.name]=null;
      $scope.setAndSave();
    }
  } 
}
 
$scope.setAndSaveJsonObject=function(){
    $("#md-objectviewer").modal("hide");      
    //Check if previous value is not equal to modified value
    if($scope.editableRow.get($scope.editableColumnName)!=JSON.parse($scope.editableJsonObj)){
      rowEditMode($scope.editableIndex);

      var requiredField = _.find($scope.currentProject.currentTable.columns, function(everyCol){
          if(everyCol.name!=$scope.editableColumnName && everyCol.name!="id" && everyCol.name!="createdAt" && everyCol.name!="updatedAt" && everyCol.name!="ACL" && everyCol.required){
           if(!$scope.editableRow.get(everyCol.name)){
            return everyCol;
           }          
          }
      });

      $scope.editableRow.set($scope.editableColumnName,JSON.parse($scope.editableJsonObj));
      if(requiredField){           
        rowWarningMode($scope.editableIndex,$scope.editableRow,$scope.editableColumnName);
      }else{
        rowSpinnerMode($scope.editableIndex);        
    
        //Save Cloud Object
        $scope.saveCloudObject($scope.editableRow)
        .then(function(obj){           
          $scope.editableJsonObj=null;
          showSaveIconInSecond($scope.editableIndex);
        }, function(error){          
          $scope.editableJsonObj=null;          
          rowErrorMode($scope.editableIndex,error);     
        });
      }  

    }else{
      $("#md-objectviewer").modal("hide");      
      $scope.editableJsonObj=null;
    }     
    
};  
//End JsonObject 

$scope.setAndSaveACLObject=function(){
    
  $("#md-aclviewer").modal("hide"); 
  //Check if previous value is not equal to modified value
  rowEditMode($scope.editableIndex);
  var requiredField = _.find($scope.currentProject.currentTable.columns, function(everyCol){
      if(everyCol.name!=$scope.editableColumnName && everyCol.name!="id" && everyCol.name!="createdAt" && everyCol.name!="updatedAt" && everyCol.name!="ACL" && everyCol.required){
       if(!$scope.editableRow.get(everyCol.name)){
        return everyCol;
       }          
      }
  });

  //$scope.editableRow.set($scope.editableColumnName,$scope.editableJsonObj);
  if(requiredField){           
    rowWarningMode($scope.editableIndex,$scope.editableRow,$scope.editableColumnName);
  }else{
    rowSpinnerMode($scope.editableIndex);        

    //Save Cloud Object
    $scope.saveCloudObject($scope.editableRow)
    .then(function(obj){           
      $scope.editableJsonObj=null;
      showSaveIconInSecond($scope.editableIndex);
      $scope.addACL={
        id:null,
        name:null,
        read:null,
        write:null,
        player:null
      }; 
    }, function(error){          
      $scope.editableJsonObj=null;          
      rowErrorMode($scope.editableIndex,error);     
    });
  }     
};  
//End ACL && JsonObject

$scope.fileSelected=function(selectedFile,fileName,fileObj){
  $scope.isFileSelected=true;
  $scope.selectedFile=selectedFile;
  $scope.selectedfileName=fileName;
  $scope.selectedFileObj=fileObj;
  $scope.selectedFileExtension=fileName.split(".")[fileName.split(".").length-1]; 

  //If List..Add it to List
  if($scope.editableColumn && $scope.editableColumn.relatedTo=="File"){     
    $scope.addListFile();
  }
};

$scope.setAndSaveFile=function(){ 
  $("#md-fileviewer").modal("hide");   
  if($scope.selectedFileObj) {

      getCBFile($scope.selectedFileObj)
      .then(function(cloudBoostFile){
          rowEditMode($scope.editableIndex);
     
          var requiredField = _.find($scope.currentProject.currentTable.columns, function(everyCol){
             if(everyCol.name!=$scope.editableColumnName && everyCol.name!="id" && everyCol.name!="createdAt" && everyCol.name!="updatedAt" && everyCol.name!="ACL" && everyCol.required){
               if(!$scope.editableRow.get(everyCol.name)){
                return everyCol;
               }          
             }
          });

          $scope.editableRow.set($scope.editableColumnName,cloudBoostFile);
          if(requiredField){
                  
            rowWarningMode($scope.editableIndex,$scope.editableRow,$scope.editableColumnName);
          }else{
            rowSpinnerMode($scope.editableIndex); 
              
              $scope.editableRow.set($scope.editableColumnName,cloudBoostFile);            
              //Save Cloud Object
              $scope.saveCloudObject($scope.editableRow)
              .then(function(obj){                 
                $scope.removeSelectdFile();
                showSaveIconInSecond($scope.editableIndex);
              }, function(error){                 
                $scope.removeSelectdFile();                   
                rowErrorMode($scope.editableIndex,error);
              }); 
          }             

      }, function(err){
        rowErrorMode($scope.editableIndex,err);
      });
            
  }
};

$scope.removeSelectdFile=function(){
  $scope.selectedFile=null;
  $scope.selectedfileName=null;
  $scope.selectedFileObj=null;
  $scope.selectedFileExtension=null;

  //nullify list modal for file
  if($scope.listEditableRow){
    $scope.listEditableRow=null;//row
    $scope.listEditableColumn=null;//row
    $scope.listIndex=null;
  }
};

$scope.deleteFile=function(){
    $("#md-fileviewer").modal("hide");
    rowEditMode($scope.editableIndex);
       
    var requiredField = _.find($scope.currentProject.currentTable.columns, function(everyCol){
       if(everyCol.name!=$scope.editableColumnName && everyCol.name!="id" && everyCol.name!="createdAt" && everyCol.name!="updatedAt" && everyCol.name!="ACL" && everyCol.required){
         if(!$scope.editableRow.get(everyCol.name)){
          return everyCol;
         }          
       }
    });

    $scope.editableRow.set($scope.editableColumnName,null); 
    if(requiredField){      
      rowWarningMode($scope.editableIndex,$scope.editableRow,$scope.editableColumnName);
    }else{
      rowSpinnerMode($scope.editableIndex);
                  
      //Save Cloud Object
      $scope.saveCloudObject($scope.editableRow)
      .then(function(obj){  
        $scope.editableFile=null;
        $scope.removeSelectdFile();
        showSaveIconInSecond($scope.editableIndex);
        
      }, function(error){ 
        $scope.editableFile=null;
        $scope.removeSelectdFile();
        rowErrorMode($scope.editableIndex,error);            
      });

    }
};

function getCBFile(fileObj){

  var q=$q.defer();

  var file = new CB.CloudFile(fileObj);
  file.save({
  success: function(newFile) {
    //got the file object successfully with the url to the file
    q.resolve(newFile); 
  },
  error: function(err) {
   //error in uploading file
    q.reject(err); 
  }
  });                

  return  q.promise;
}  

//End of Files


//Geo Point
/*$scope.toggleGoogleMap=function(event,row,column){     
    var geoPointJson=row.get(column.name);
    var index=$scope.currentTableData.indexOf(row);
        
    var mapId="#"+index+""+column.name+"map";
    
    uiGmapGoogleMapApi.then(function(maps) {            
          
      $scope.map = {
          center: {
              latitude: geoPointJson.latitude,
              longitude: geoPointJson.longitude
          },
          zoom: 14
      };
      $scope.marker = {
          id: 1,
          coords: {
              latitude: geoPointJson.latitude,
              longitude: geoPointJson.longitude
          }
      };

      $(event.target).stackbox({
          closeButton: true,
          animOpen:"fadeIn",
          width:"490px",
          marginY:9,
          position: 'bottom',
          autoAdjust:false,
          content: mapId,
          autoScroll:true,
          beforeClose:function(){
            $scope.map = {};
            $scope.marker = {};
          }
      });
      
    });      
};*/

$scope.setAndSaveGeopoint=function(valid){
  if(!$scope.geoPointValidation('longitude',$scope.editableGeopoint.longitude)){
    $scope.geoPointValidation('latitude',$scope.editableGeopoint.latitude);    
  }

  if(valid  && !$scope.geopointEditError){

    if($scope.editableRow.get($scope.editableColumnName)){//if geopoint is there

      //checking for old data!=new data
      if(($scope.editableRow.get($scope.editableColumnName).latitude!=$scope.editableGeopoint.latitude) || ($scope.editableRow.get($scope.editableColumnName).longitude!=$scope.editableGeopoint.longitude)){
        var loc = new CB.CloudGeoPoint($scope.editableGeopoint.longitude,$scope.editableGeopoint.latitude);
        $scope.editableRow.set($scope.editableColumnName,loc);
        saveGeopoint(); 

      }else{
        $("#md-geodocumentviewer").modal("hide");
        $scope.editableGeopoint=null;
      }

    }else{//else empty
      var loc = new CB.CloudGeoPoint($scope.editableGeopoint.longitude,$scope.editableGeopoint.latitude);
      $scope.editableRow.set($scope.editableColumnName,loc);       
      saveGeopoint();
    }
  }    
};

function saveGeopoint(){
  $("#md-geodocumentviewer").modal("hide");
  rowEditMode($scope.editableIndex);
 
  var requiredField = _.find($scope.currentProject.currentTable.columns, function(everyCol){
     if(everyCol.name!=$scope.editableColumnName && everyCol.name!="id" && everyCol.name!="createdAt" && everyCol.name!="updatedAt" && everyCol.name!="ACL" && everyCol.required){
       if(!$scope.editableRow.get(everyCol.name)){
        return everyCol;
       }          
     }
  });
  
  if(requiredField){  
        
    rowWarningMode($scope.editableIndex,$scope.editableRow,$scope.editableColumnName);
  }else{
    rowSpinnerMode($scope.editableIndex);

    //Save Cloud Object
    $scope.saveCloudObject($scope.editableRow)
    .then(function(obj){       
      $scope.editableGeopoint=null;
      showSaveIconInSecond($scope.editableIndex);
    }, function(error){       
      $scope.editableGeopoint=null;
      rowErrorMode($scope.editableIndex,error);    
    });
  }  
}  

//End of Geo point

//RELATION
$scope.addRelation=function(row,column){  
  
  if(row.get(column.name)){
    //var tableName=row.get(column.name).document._tableName;
    var rowId=row.get(column.name).document._id; 
    $scope.linkedRelatedDoc=rowId;
    $scope.relToRel=false;
    //$("#md-reldocumentviewer").modal(); 
    $scope.viewRelationData(row,column,null);   
  }else{
    nullifyEditable();
    $scope.editableRow=row;//row
    $scope.editableColumn=column;//column
    $scope.editableColumnName=column.name;//column name 
    $scope.editableIndex=$scope.currentTableData.indexOf(row);//index

    $scope.relColumn=_.first(_.where($rootScope.currentProject.currentTable.columns,{name:column.name}));
    $scope.tableDef=_.first(_.where($rootScope.currentProject.tables, {name: $scope.relColumn.relatedTo}));

    $scope.linkedRelatedDoc=null;    
    $scope.searchRelationDocs();
  } 
};

$scope.addRelationToRelation=function(cloudObject,column){  
  
  $scope.relEditableRow=cloudObject;//row
  $scope.relEditableColumn=column;

  var index=$scope.relatedTableDefArray.length-1;  
  var columns=$scope.relatedTableDefArray[index].columns;

  $scope.relColumn=_.first(_.where(columns,{name:column.name}));
  $scope.tableDef=_.first(_.where($rootScope.currentProject.tables, {name: $scope.relColumn.relatedTo}));
  
  if(cloudObject.get(column.name)){
  
    var rowId=cloudObject.get(column.name).document._id; 
    $scope.linkedRelatedDoc=rowId;
    $scope.relToRel=true;
    $("#md-reldocumentviewer").modal();
    
  }else{
    $scope.linkedRelatedDoc=null;
    $scope.relToRel=true;    
    $scope.searchRelationDocs();
  } 
};

$scope.searchRelationDocs=function(){
  $("#md-reldocumentviewer").modal("hide");  

 //List Relations records 
  $scope.loadTableData($scope.tableDef,"createdAt","asc",20,0)
  .then(function(list){        
       
   $scope.relationTableData=list;   
   $("#md-searchreldocument").modal();          
   //$scope.$digest(); 
                                          
  },function(error){ 
    $scope.searchRelDocsError=error;      
  });
  //List Relations records    
};

$scope.linkRecord=function(relationCBRecord){

    var i=$scope.currentTableData.indexOf($scope.editableRow);   
    rowEditMode(i);
   
    var requiredField = _.find($scope.currentProject.currentTable.columns, function(everyCol){
      if(everyCol.name!=$scope.editableColumnName && everyCol.name!="id" && everyCol.name!="createdAt" && everyCol.name!="updatedAt" && everyCol.name!="ACL" && everyCol.required){
        if(!$scope.editableRow.get(everyCol.name)){
          return everyCol;
        }          
      }
    });

    $scope.editableRow.set($scope.editableColumnName,relationCBRecord); 
    if(requiredField){      
      rowWarningMode(i,$scope.editableRow,$scope.editableColumnName);
      $("#md-searchreldocument").modal("hide");
      $("#md-reldocumentviewer").modal("hide");     
    }else{
      rowSpinnerMode(i);
                 
      $("#md-searchreldocument").modal("hide");
                 
      //Save Cloud Object
      $scope.saveCloudObject($scope.editableRow)
      .then(function(obj){          
        showSaveIconInSecond(i);
        
      }, function(error){ 
        $("#md-searchreldocument").modal("hide");      
        rowErrorMode(i,error);
      });

    }      
};

$scope.viewRelationData=function(row,column,index){
    nullifyEditable();
    //$scope.editableRow=row;//row
    //$scope.editableColumn=column;
    //$scope.editableColumnName=column.name;//column name 
    //$scope.editableIndex=$scope.currentTableData.indexOf(row);//index    

    if(row.get(column.name) instanceof Array){
      $("#md-list-commontypes").modal("hide")
      var tableName=row.get(column.name)[index].document._tableName;
      var rowId=row.get(column.name)[index].document._id;
    }else{
      var tableName=row.get(column.name).document._tableName;
      var rowId=row.get(column.name).document._id;
    } 
    var tableDef=_.first(_.where($rootScope.currentProject.tables, {name: tableName})); 
    
    //get Table data
    $scope.queryTableById(tableDef,rowId)
    .then(function(record){       

      if(record){
        //Convert ISODate 2 DateObject
        convertISO2DateObj(tableDef,record); 
        $scope.relatedTableDefArray.push(tableDef);       
        $scope.relatedTableRecordArray.push(record);        

        //Nullify errors
        //clearRelationErrors();        
      }     
    
      $("#md-relationviewer").modal();

    }, function(error){
      $scope.viewRelDataError.push(error);
      $("#md-relationviewer").modal();  
    });
    //End of get Table data       
}; 

$scope.goToPrevRel=function(){
  //Simple relation
  if($scope.relatedTableDefArray && $scope.relatedTableDefArray.length>1){
    var lastIndex=$scope.relatedTableDefArray.length-1;
    $scope.relatedTableDefArray.splice(lastIndex,1);
    $scope.relatedTableRecordArray.splice(lastIndex,1);
  
    $("#md-relationviewer").modal();      
  }
};

$scope.closeRelModal=function(){  
  //Simple Relation
  if($scope.relatedTableDefArray && $scope.relatedTableDefArray.length>1){
    var lastIndex=$scope.relatedTableDefArray.length-1;
    $scope.relatedTableDefArray.splice(lastIndex,1);
    $scope.relatedTableRecordArray.splice(lastIndex,1);
  
    $("#md-relationviewer").modal();     
  }else{
    $scope.relatedTableDefArray=[];
    $scope.relatedTableRecordArray=[];
    $("#md-relationviewer").modal("hide");
  }

};

function convertISO2DateObj(table,cloudObject){
  for(var i=0;i<table.columns.length;++i){
    if(table.columns[i].document.dataType=="DateTime"){
      var isoDate=cloudObject.get(table.columns[i].name);
      if(isoDate && table.columns[i].name=="expires"){
        cloudObject.set(table.columns[i].name,new Date(isoDate));
      }else if(table.columns[i].name!="expires"){
        cloudObject.set(table.columns[i].name,new Date(isoDate));
      }      
    }
  }
}

$scope.deleteRelLink=function(row,column){
    var i=$scope.currentTableData.indexOf(row);   
    rowEditMode(i);
   
    var requiredField = _.find($scope.currentProject.currentTable.columns, function(everyCol){
       if(everyCol.name!=column.name && everyCol.name!="id" && everyCol.name!="createdAt" && everyCol.name!="updatedAt" && everyCol.name!="ACL" && everyCol.required){
         if(!$scope.editableRow.get(everyCol.name)){
          return everyCol;
         }          
       }
    });
    row.set(column.name,null);

    if(requiredField){      
      rowWarningMode(i,row,column.name);     
    }else{
      rowSpinnerMode(i);
                  
      //Save Cloud Object
      $scope.saveCloudObject(row)
      .then(function(obj){      
        $scope.relatedTableDefArray=[];
        $scope.relatedTableRecordArray=[];
        showSaveIconInSecond(i);
        $scope.linkedRelatedDoc=null;
        //$("#md-reldocumentviewer").modal("hide");
      }, function(error){ 
          rowErrorMode(i,error); 
          //$("#md-reldocumentviewer").modal("hide"); 
      });

    }
};

$scope.holdRelationData=function(cloudObject,column,data){
  if(!column.required){
    if(column.dataType=="EncryptedText"){
      $scope.relationHoldData[column.name]=null;
      $scope.relationShowInput[column.name]=true;        
      $scope.nullAccepted=false;
      var inputId=column.name+"relcol";
      focus(inputId); 
      //$scope.relatedTableRecordArray[$scope.relatedTableRecordArray.length-1].document[column.name]=null;
    }      
  }
};

$scope.deleteRelationData=function(cloudObject,column,data){
  if(!column.required){
    if(column.dataType=="EncryptedText"){    
      cloudObject.set(column.name,null);
      $scope.nullAccepted=true;
    }
  }    
};

$scope.setRelationData=function(cloudObject,column,data){
  $scope.relationError[column.name]=null;

  //DateTime
  if(column.document.dataType=="DateTime"){
    if(data){
      data=new Date(data);
    }    
  }
  //ACL
  if(column.document.dataType=="ACL"){      
    try {     
      if(typeof data!="object"){
        $scope.relationError[column.name]="Invalid Object";
      }else{
        $("#md-rel-aclviewer").modal("hide");
      }  
    }
    catch(err) {
      $scope.relationError[column.name]="Invalid Object";
    }
  }
  //Object
  if(column.document.dataType=="Object"){      
    try {
      data=JSON.parse(data);
      if(typeof data!="object"){
        $scope.relationError[column.name]="Invalid Object";
      }else{
        $("#md-rel-objectviewer").modal("hide");
      }  
    }
    catch(err) {
      $scope.relationError[column.name]="Invalid Object";
    }
  }
  //Email
  if(column.document.dataType=="Email" && !validateEmail(data)){
    $scope.relationError[column.name]="Invalid Email";
  }
  //URL
  if(column.document.dataType=="URL" && !validateURL(data)){
    $scope.relationError[column.name]="Invalid URL";
  }       

  //Number
  if(column.document.dataType=="Number"){
    var tempData=data;
    data=parseInt(data);
    if(data.toString()==tempData){

    }else{
      data=null;
      $scope.relationError[column.name]="Invalid Number";
    }
  }
  //File
  if(column.document.dataType=="File"){
    $("#md-rel-fileviewer").modal("hide");
  }
  //Relation
  if(column.document.dataType=="Relation"){
    if(data){
      $("#md-searchreldocument").modal("hide");
    }else{
      $scope.linkedRelatedDoc=null;
    }    
    $("#md-reldocumentviewer").modal("hide");
  }

  //EncryptedText
  if(column.document.dataType=="EncryptedText"){
    if(!$scope.nullAccepted && !data){
      $scope.relationShowInput[column.name]=false;
    }else if(!$scope.relationError[column.name]){
      cloudObject.set(column.name,data);
    }
    $scope.nullAccepted=true;      
  }else if(column.document.dataType=="List"){//List
    if(!checkListErrors()){
      cloudObject.set(column.name,data);
      $("#md-list-commontypes").modal("hide");
    }   
  }else if(!$scope.relationError[column.name]){
    cloudObject.set(column.name,data);
  }
      
};

$scope.showRelationModals=function(cloudObject,column){
  $scope.relEditableRow=cloudObject;//row
  $scope.relEditableColumn=column;
  $scope.relEditableColumnName=column.name;

  //ACL
  if(column.document.dataType=="ACL"){
    
    $scope.relEditableJsonObj=angular.copy(cloudObject.get(column.name));   
    if(!cloudObject.get(column.name)){
      $scope.relEditableJsonObj=null;
    }   
   
    if($scope.relEditableJsonObj){      
        
        prepareACLDisplay($scope.relEditableJsonObj);
        $scope.addACL=[];
        $scope.aclUsers=[];
        $scope.aclRoles=[];

        //Getting Users For Autocomplete
        $scope.queryTableByName("User")
        .then(function(userRecords){         
          $scope.userRecords=userRecords;        
        },function(error){         
        });

        //Getting Roles For Autocomplete
        $scope.queryTableByName("Role")
        .then(function(roleRecords){         
          $scope.roleRecords=roleRecords;  
        },function(error){           
        });       
    }

    //$("#md-rel-aclviewer").modal("show");
  }

  //Object
  if(column.document.dataType=="Object"){
    
    $scope.relEditableJsonObj=angular.copy(cloudObject.get(column.name));   
    if(!cloudObject.get(column.name)){
      $scope.relEditableJsonObj=null;
    }
    $scope.relEditableJsonObj=JSON.stringify($scope.relEditableJsonObj,null,2);
    $("#md-rel-objectviewer").modal("show");
  }

  //GeoPoint
  if(column.document.dataType=="GeoPoint"){
    $scope.relEditableGeopoint=angular.copy(cloudObject.get(column.name));   
    if(!cloudObject.get(column.name)){
       $scope.relEditableGeopoint={};     
       $scope.relEditableGeopoint.latitude=null;
       $scope.relEditableGeopoint.longitude=null;
    }
    $("#md-rel-geodocumentviewer").modal();
  }
  //File
  if(column.document.dataType=="File"){
    $scope.relEditableFile=angular.copy(cloudObject.get(column.name));
    $("#md-rel-fileviewer").modal();
  }
  //List
  //if(column.document.dataType=="List"){    
  //}
    
};

$scope.relfileSelected=function(column,selectedFile,fileName,fileObj){  
  column=CB.fromJSON(column.document);

  $scope.relEditableRow=$scope.relatedTableRecordArray[$scope.relatedTableRecordArray.length-1];
  $scope.relEditableColumn=column;
  $scope.relEditableColumnName=column.name;

  $scope.isFileSelected=true;
  $scope.selectedFile=selectedFile;
  $scope.selectedfileName=fileName;
  $scope.selectedFileObj=fileObj;
  $scope.selectedFileExtension=fileName.split(".")[fileName.split(".").length-1]; 
  $scope.setRelFile();
};

//relation File
$scope.setRelFile=function(){    
  if($scope.selectedFileObj) {
    //$("#md-rel-fileviewer").modal("hide");
    $scope.setRelFileSpinner[$scope.relEditableColumnName]=true;

    getCBFile($scope.selectedFileObj)
    .then(function(cloudBoostFile){
    
        $scope.relEditableRow.set($scope.relEditableColumnName,cloudBoostFile);        
        $scope.removeSelectdFile(); 
        $scope.setRelFileSpinner[$scope.relEditableColumnName]=false; 
        $scope.relEditableRow=null; 
        $scope.relEditableColumn=null;
        $scope.relEditableColumnName=null;
        $scope.relEditableFile=null;
        //progress bar
        $scope.relFileProgress.progressTimer('complete');      

    }, function(err){
      $scope.setRelFileSpinner[$scope.relEditableColumnName]=false; 
      $scope.setRelFileError[$scope.relEditableColumnName]="Something went wrong .try again";
      $timeout(function(){ 
        $scope.setRelFileError[$scope.relEditableColumnName]=null;         
      }, 1500);
    });
            
  }
};
//End of Relation File


$scope.relSetAndSaveGeopoint=function(valid){
  
  if(!$scope.geoPointValidation('longitude',$scope.relEditableGeopoint.longitude)){
    $scope.geoPointValidation('latitude',$scope.relEditableGeopoint.latitude);
  }  

  if(valid  && !$scope.geopointEditError){

    if($scope.relEditableRow.get($scope.relEditableColumnName)){//if geopoint is there

      //checking for old data!=new data
      if(($scope.relEditableRow.get($scope.relEditableColumnName).latitude!=$scope.relEditableGeopoint.latitude) || ($scope.relEditableRow.get($scope.relEditableColumnName).longitude!=$scope.relEditableGeopoint.longitude)){
        var loc = new CB.CloudGeoPoint($scope.relEditableGeopoint.longitude,$scope.relEditableGeopoint.latitude);
        $scope.relEditableRow.set($scope.relEditableColumnName,loc);
        //relSaveGeopoint();
        $("#md-rel-geodocumentviewer").modal("hide");

      }else{
      $("#md-rel-geodocumentviewer").modal("hide");
      $scope.relEditableGeopoint=null;
      }

    }else{//else empty
      var loc = new CB.CloudGeoPoint($scope.relEditableGeopoint.longitude,$scope.relEditableGeopoint.latitude);
      $scope.relEditableRow.set($scope.relEditableColumnName,loc);
      //relSaveGeopoint();
      $("#md-rel-geodocumentviewer").modal("hide");
    }
  }    
};

//Clear All Errors
function clearRelationErrors(){

  var columns=$scope.relatedTableDefArray[$scope.relatedTableDefArray.length-1].columns;
  for(var i=0;i<columns.length;++i){
    var colname=columns[i].name;
    $scope.relationError[colname]=null;
    $scope.relationShowInput[colname]=false;       
  }
  
}
//Check List Errors
function checkRelationErrors(){
  var columns=$scope.relatedTableDefArray[$scope.relatedTableDefArray.length-1].columns;

  var there = _.find(columns, function(eachCol){ 
    if($scope.relationError[eachCol.name]){
      return eachCol;
    }
  });

  if(there){
    return true;
  }else{
    return false;
  }
  
}

//Relation List
$scope.showRelationList=function(cloudObject,column,functionality,data,index){
  nullifyEditable();
  $scope.editableRow=cloudObject;//row
  $scope.editableColumn=column;//column
  $scope.editableColumnName=column.name;//column name

  $scope.editableList=cloudObject.get(column.name); 

  $scope.newListItem=null;
  $scope.addListItemError=null;
  clearListErrors();  
    
  if(column.relatedTo=="DateTime"){    
    convertFieldsISO2DateObj(); 
  } 
  $scope.isRelationalList=true;

  //$("#md-list-commontypes").modal(); 
  //if(!$scope.editableList || $scope.editableList.length==0){
    //$scope.listSearchRelationDocs();
  //}   
  if(functionality=="add"){
    $scope.addListItem();
  }else if(functionality=="modify"){

    if(column.document.relatedTo=='Object'){
      $scope.showListJsonObject(data,index);
    }else if(column.document.relatedTo=='GeoPoint'){
      $scope.editListGeoPoint(index);
    }else{
      $scope.modifyListItem(data,index);
    }    

  }else if(functionality=="delete"){
    $scope.deleteListItem(index);
  }
  

};
//End of relation

function convertFieldsISO2DateObj(){
  if($scope.editableList && $scope.editableList.length>0){
    for(var i=0;i<$scope.editableList.length;++i){
      $scope.editableList[i]= new Date($scope.editableList[i]);
    }    
  }      
}

/*
$scope.addListItem=function(newListItem){
  $scope.addListItemError=null;
  if(newListItem || $scope.editableColumn.relatedTo=="Boolean" || $scope.editableColumn.relatedTo=="Object"){
      if(!$scope.editableList || $scope.editableList.length==0){
        $scope.editableList=[];
      }
      if( $scope.editableColumn.relatedTo=="DateTime"){    
        newListItem=new Date(newListItem); 
      }
      if( $scope.editableColumn.relatedTo=="Object"){    
        newListItem={}; 
      }
      if($scope.editableColumn.relatedTo=="Number"){ 
        var tempData=newListItem;
        newListItem=parseInt(newListItem);
        if(newListItem.toString()==tempData){

        }else{
          newListItem=null;
          $scope.addListItemError="Invalid Number";
        }               
      }
      if($scope.editableColumn.relatedTo=="Email" && !validateEmail(newListItem)){     
        newListItem=null;
        $scope.addListItemError="Invalid Email";
      }
      if($scope.editableColumn.relatedTo=="URL" && !validateURL(newListItem)){     
        newListItem=null;
        $scope.addListItemError="Invalid URL";
      }     

      if($scope.editableColumn.relatedTo!='Text' && $scope.editableColumn.relatedTo!='Email' && $scope.editableColumn.relatedTo!='URL' && $scope.editableColumn.relatedTo!='Number' && $scope.editableColumn.relatedTo!='DateTime' && $scope.editableColumn.relatedTo!='Object' && $scope.editableColumn.relatedTo!='Boolean' && $scope.editableColumn.relatedTo!='File' && $scope.editableColumn.relatedTo!='GeoPoint'){
        $("#md-searchlistdocument").modal("hide");
      }

      if(newListItem || $scope.editableColumn.relatedTo=="Boolean" || $scope.editableColumn.relatedTo=="Object"){
        $scope.editableList.push(newListItem);
        $scope.newListItem=null;
      }                 
  }
  
};*/

$scope.addListItem=function(item){
  
  $scope.addListItemError=null;
  
  if(!$scope.editableList || $scope.editableList.length==0){
    $scope.editableList=[];
  }
  var newListItem=null;

  /*********************ADD ITEM*************************************/
  if($scope.editableColumn.relatedTo=="DateTime"){    
    newListItem=new Date(); 
  }
  if( $scope.editableColumn.relatedTo=="Object"){    
    newListItem={}; 
  }
  if($scope.editableColumn.relatedTo=="Number"){ 
    newListItem=0;              
  }
  if($scope.editableColumn.relatedTo=="Email"){     
    newListItem="hello@cloudboost.io";    
  }
  if($scope.editableColumn.relatedTo=="URL"){     
    newListItem="http://cloudboost.io";    
  }

  if($scope.editableColumn.relatedTo=="GeoPoint"){    
    $scope.addListGeopointModal();         
  }

  if($scope.editableColumn.relatedTo!='Text' && $scope.editableColumn.relatedTo!='Email' && $scope.editableColumn.relatedTo!='URL' && $scope.editableColumn.relatedTo!='Number' && $scope.editableColumn.relatedTo!='DateTime' && $scope.editableColumn.relatedTo!='Object' && $scope.editableColumn.relatedTo!='Boolean' && $scope.editableColumn.relatedTo!='File' && $scope.editableColumn.relatedTo!='GeoPoint'){
    if(item){
      newListItem=item;
      $("#md-searchlistdocument").modal("hide");
    }else{
      $scope.listSearchRelationDocs();
    }    
  }

  if($scope.editableColumn.relatedTo!='Text' && $scope.editableColumn.relatedTo!='Email' && $scope.editableColumn.relatedTo!='URL' && $scope.editableColumn.relatedTo!='Number' && $scope.editableColumn.relatedTo!='DateTime' && $scope.editableColumn.relatedTo!='Object' && $scope.editableColumn.relatedTo!='Boolean' && $scope.editableColumn.relatedTo!='File' && $scope.editableColumn.relatedTo!='GeoPoint'){
    if(newListItem){
      //Push Record
      $scope.editableList.push(newListItem); 

      //If Relation
      if($scope.relatedTableRecordArray && $scope.relatedTableRecordArray.length>0){
        $scope.editableRow.set($scope.editableColumn.name,$scope.editableList);
      }
    }    
  }else if($scope.editableColumn.relatedTo!="GeoPoint"){    
    $scope.editableList.push(newListItem); 
    //If Relation
    if($scope.relatedTableRecordArray && $scope.relatedTableRecordArray.length>0){
      $scope.editableRow.set($scope.editableColumn.name,$scope.editableList);
    }   
  } 

};

$scope.modifyListItem=function(data,index){  

  $scope.modifyListItemError[index]=null;
  if(data || $scope.editableColumn.relatedTo=="Boolean" || $scope.editableColumn.relatedTo=="Object"){
      
      if($scope.editableColumn.relatedTo=="DateTime"){    
        data=new Date(data); 
      }      
      if($scope.editableColumn.relatedTo=="Number"){ 
        var tempData=data;
        data=parseInt(data);
        if(data.toString()==tempData){
        }else{
          data=null;
          $scope.modifyListItemError[index]="Invalid Number";
        }               
      }
      if($scope.editableColumn.relatedTo=="Email" && !validateEmail(data)){     
        data=null;
        $scope.modifyListItemError[index]="Invalid Email";
      }
      if($scope.editableColumn.relatedTo=="URL" && !validateURL(data)){     
        data=null;
        $scope.modifyListItemError[index]="Invalid URL";
      }

      if($scope.editableColumn.relatedTo=="Object"){ 
        data=JSON.parse(data);

        if(typeof data!="object"){
          data=null;
          $scope.modifyListItemError[index]="Invalid Object";
        }else{          
          $("#md-list-objectviewer").modal("hide"); 
        }        
      }

      if((data || $scope.editableColumn.relatedTo=="Boolean") && (!$scope.modifyListItemError[index])){
        $scope.editableList[index]=data; 

        //If Relation
        if($scope.relatedTableRecordArray && $scope.relatedTableRecordArray.length>0){
          $scope.editableRow.set($scope.editableColumn.name,$scope.editableList);          
        }      
      }                      
  }
  
};

$scope.deleteListItem=function(index){
  $("#md-list-fileviewer").modal("hide");
  $scope.editableList.splice(index,1);
  if($scope.editableList.length==0){
    $scope.editableList=null;
  }
  if($scope.editableColumn.relatedTo=="File"){     
    $scope.listEditableRow=null;//row
    $scope.listEditableColumn=null;//row
    $scope.listIndex=null;
  } 
  //If Relation
  if($scope.relatedTableRecordArray && $scope.relatedTableRecordArray.length>0){
    $scope.editableRow.set($scope.editableColumn.name,$scope.editableList);
  }  
};

$scope.deleteListItemFromTable=function(row,column,index){
  nullifyFields();
  $scope.editableRow=row;//row
  $scope.editableColumnName=column.name;//column name 
  $scope.editableColumn=column;
  $scope.editableIndex=$scope.currentTableData.indexOf(row);//index

  $scope.editableList=angular.copy(row.get(column.name));
  $scope.editableList.splice(index,1);   
  $scope.setAndSaveList();
};

$scope.setAndSaveList=function(){ 
  if(!checkListErrors()){
  
    $("#md-list-commontypes").modal("hide");

    rowEditMode($scope.editableIndex);
   
    var requiredField = _.find($scope.currentProject.currentTable.columns, function(everyCol){
       if(everyCol.name!=$scope.editableColumnName && everyCol.name!="id" && everyCol.name!="createdAt" && everyCol.name!="updatedAt" && everyCol.name!="ACL" && everyCol.required){
         if(!$scope.editableRow.get(everyCol.name)){
          return everyCol;
         }          
       }
    });  
    
    $scope.editableRow.set($scope.editableColumnName,$scope.editableList);

    if(requiredField){      
      rowWarningMode($scope.editableIndex,$scope.editableRow,$scope.editableColumnName);     
    }else{
      rowSpinnerMode($scope.editableIndex);

      //Save Cloud Object
      $scope.saveCloudObject($scope.editableRow)
      .then(function(obj){ 
       
        showSaveIconInSecond($scope.editableIndex);

        //$scope.$digest();  
      }, function(error){       
        rowErrorMode($scope.editableIndex,error);
        //$scope.$digest();         
      });

    } 
  }
};


//List ACL && JsonObject
$scope.showListJsonObject=function(row,index){ 
  $scope.listEditableRow=row;//row
  $scope.listIndex=index;      
  if(!row){
    $scope.listEditableRow=null;
  }  
  $scope.listEditableRow=JSON.stringify($scope.listEditableRow,null,2);
  $("#md-list-objectviewer").modal("show");
};

//List File
//$scope.addListFileModal=function(){  
  //$("#md-list-fileviewer").modal("show");
//};

$scope.addListFile=function(){   
  //$("#md-list-fileviewer").modal("hide"); 
  if($scope.selectedFileObj) {     
    if(!$scope.editableList || $scope.editableList.length==0){
      $scope.editableList=[];
    }
    var dummyObj={};
    $scope.editableList.unshift(dummyObj);
    var index=$scope.editableList.indexOf(dummyObj);
    $scope.listFileSpinner[index]=true;

    getCBFile($scope.selectedFileObj)
    .then(function(cloudBoostFile){     
      $scope.editableList[index]=cloudBoostFile;       
      //$scope.editableList.push(cloudBoostFile);      
      $scope.removeSelectdFile();
      $scope.listFileSpinner[index]=false;

    }, function(err){
      $scope.listFileError[index]="Something went wrong. try again";
    });

  }
};

$scope.relListFileSelected=function(column,selectedFile,fileName,fileObj){  
  column=CB.fromJSON(column.document);

  $scope.editableRow=$scope.relatedTableRecordArray[$scope.relatedTableRecordArray.length-1];
  $scope.editableColumn=column;  

  $scope.editableList=$scope.editableRow.get(column.name); 
  $scope.newListItem=null;
  $scope.addListItemError=null;
  clearListErrors();
  $scope.isRelationalList=true;

  $scope.isFileSelected=true;
  $scope.selectedFile=selectedFile;
  $scope.selectedfileName=fileName;
  $scope.selectedFileObj=fileObj;
  $scope.selectedFileExtension=fileName.split(".")[fileName.split(".").length-1]; 

  if(!$scope.editableList || $scope.editableList.length==0){
    $scope.editableList=[];
  }

  
  var dummyObj={};
  $scope.editableList.unshift(dummyObj);  
  var newIndex=$scope.editableList.indexOf(dummyObj);  
  $scope.editableRow.set($scope.editableColumn.name,$scope.editableList);

  $scope.listFileSpinner[newIndex]=true;
  $scope.$digest();  

  getCBFile($scope.selectedFileObj)
  .then(function(cloudBoostFile){   
        
    $scope.editableList[newIndex]=cloudBoostFile;      
    $scope.removeSelectdFile();
    $scope.editableRow.set($scope.editableColumn.name,$scope.editableList);
    $scope.listFileSpinner[newIndex]=false;
    //progress bar
    $scope.relFileProgress.progressTimer('complete'); 
  }, function(err){    
    $scope.listFileSpinner[newIndex]=false;
  }); 
};

$scope.deleteRelationListItem=function(index,column){ 

  $scope.editableRow=$scope.relatedTableRecordArray[$scope.relatedTableRecordArray.length-1];
  $scope.editableColumn=column;  

  $scope.editableList=$scope.editableRow.get(column.name);

  $scope.editableList.splice(index,1);
  if($scope.editableList.length==0){
    $scope.editableList=null;
  }

  if($scope.editableColumn.relatedTo=="File"){     
    $scope.listEditableRow=null;//row
    $scope.listEditableColumn=null;//row
    $scope.listIndex=null;
  }  
  $scope.editableRow.set($scope.editableColumn.name,$scope.editableList);   
};

//List ShowFile
$scope.showListFile=function(row,column,index){ 
  $scope.listEditableRow=row;//row
  $scope.listEditableColumn=column;//row
  $scope.listIndex=index;   
  $("#md-list-fileviewer").modal("show");
};

//List Relationdocs search
$scope.listSearchRelationDocs=function(){ 
  $scope.tableDef=_.first(_.where($rootScope.currentProject.tables, {name: $scope.editableColumn.relatedTo}));
  //List Relations records 
  $scope.loadTableData($scope.tableDef,"createdAt","asc",20,0)
  .then(function(list){ 
    $scope.listRelationTableData=list; 
    $("#md-searchlistdocument").modal("show");         
    //$scope.$digest();                                       
  },function(error){ 
    $scope.searchRelDocsError=error;      
  });
  //List Relations records   
};



//List Geopoint
/*
$scope.listToggleGoogleMap=function(event,row,column,listIndex){     
    var geoPointJson=row.get(column.name)[listIndex];
    var index=$scope.currentTableData.indexOf(row);
        
    var mapId="#"+index+""+column.name+"listmap";
    
    uiGmapGoogleMapApi.then(function(maps) {            
          
      $scope.map = {
          center: {
              latitude: geoPointJson.latitude,
              longitude: geoPointJson.longitude
          },
          zoom: 14
      };
      $scope.marker = {
          id: 1,
          coords: {
              latitude: geoPointJson.latitude,
              longitude: geoPointJson.longitude
          }
      };

      $(event.target).stackbox({
          closeButton: true,
          animOpen:"fadeIn",
          width:"490px",
          marginY:9,
          position: 'bottom',
          autoAdjust:false,
          content: mapId,
          autoScroll:true,
          beforeClose:function(){
            $scope.map = {};
            $scope.marker = {};
          }
      });
      
    });      
};*/

//List Geopoint
$scope.addListGeopointModal=function(){ 
  $scope.listEditableGeopoint={}; 
  $scope.listEditableGeopoint.latitude=null;
  $scope.listEditableGeopoint.longitude=null;
  $("#md-list-geodocumentviewer").modal("show");
};

$scope.listAddGeopoint=function(valid){
  
  if(!$scope.geoPointValidation('longitude',$scope.listEditableGeopoint.longitude)){
    $scope.geoPointValidation('latitude',$scope.listEditableGeopoint.latitude);
  }

  if(valid  && !$scope.geopointEditError){    
    var loc = new CB.CloudGeoPoint($scope.listEditableGeopoint.longitude,$scope.listEditableGeopoint.latitude);
    if(!$scope.editableList || $scope.editableList.length==0){
      $scope.editableList=[];
    }
    $scope.editableList.push(loc);     
    $scope.listEditableGeopoint.latitude=null;
    $scope.listEditableGeopoint.longitude=null; 
    $("#md-list-geodocumentviewer").modal("hide");     
  }  
};

$scope.editListGeoPoint=function(index){
  $scope.geopointListIndex=index;
  $scope.listEditableGeopoint={}; 
  $scope.listEditableGeopoint.latitude=$scope.editableList[index].latitude;
  $scope.listEditableGeopoint.longitude=$scope.editableList[index].longitude;
  $("#md-list-edit-geodocumentviewer").modal("show");
};

$scope.modifyListGeoPoint=function(valid){  
  if(valid  && !$scope.geopointEditError){

    //checking for old data!=new data
    if(($scope.editableList[$scope.geopointListIndex].latitude!=$scope.listEditableGeopoint.latitude) || ($scope.editableList[$scope.geopointListIndex].longitude!=$scope.listEditableGeopoint.longitude)){
      var loc = new CB.CloudGeoPoint($scope.listEditableGeopoint.longitude,$scope.listEditableGeopoint.latitude);   
      $scope.editableList[$scope.geopointListIndex]=loc;      
      
      $scope.listEditableGeopoint.latitude=null;
      $scope.listEditableGeopoint.longitude=null; 
      $("#md-list-edit-geodocumentviewer").modal("hide");   
     
    }
    
  }  
};

//Clear List All Errors
function clearListErrors(){
  if($scope.modifyListItemError && $scope.modifyListItemError.length>0){
    for(var i=0;i<$scope.modifyListItemError.length;++i){
      $scope.modifyListItemError[i]=null;      
    }
  }
}
//Check List Errors
function checkListErrors(){
  if($scope.modifyListItemError && $scope.modifyListItemError.length>0){
    var there = _.find($scope.modifyListItemError, function(val){ 
        if(val){
          return val;
        }
    });
    if(there){
      return true;
    }else{
      return false;
    }

  }else{
    return false;
  }  
}
//End of List
$scope.closeListModal=function(){
  nullifyEditable();
};

function nullifyFields(){
  //Disable column to edit
  if(typeof $scope.editableIndex=="number" && $scope.editableColumnName){ 

    if($scope.showInputForEdit[$scope.editableIndex] && $scope.showInputForEdit[$scope.editableIndex][$scope.editableColumnName]){
      $scope.showInputForEdit[$scope.editableIndex][$scope.editableColumnName]=false;
    } 
    if($scope.editableField.length>0){
      if($scope.editableField[$scope.editableIndex] && $scope.editableField[$scope.editableIndex].length>0){
        $scope.editableField[$scope.editableIndex][$scope.editableColumnName]=null;//field or value
      }       
    }    
  }
           
  nullifyEditable(); 
}
function nullifyEditable(){             
  $scope.editableRow=null;//row
  $scope.editableColumnName=null;//column name 
  $scope.editableIndex=null;//index 
  $scope.nullAccepted=false;
}

//Save 
$scope.setAndSave=function(){
  var data=$scope.editableField[$scope.editableIndex][$scope.editableColumnName];
  var holdData=$scope.holdFieldData[$scope.editableIndex][$scope.editableColumnName];

  if(!$scope.nullAccepted && $scope.editableColumn.document.dataType=="EncryptedText" && (!data || data==null)){
    $scope.editableField[$scope.editableIndex][$scope.editableColumnName]=holdData;
    $scope.showInputForEdit[$scope.editableIndex][$scope.editableColumnName]=false;
  }else{         
    save();
  }      
  
};

function save(){
  //Check if previous value is not equal to modified value
  $scope.showInputForEdit[$scope.editableIndex][$scope.editableColumnName]=false;
  if($scope.editableRow.get($scope.editableColumnName)!=$scope.editableField[$scope.editableIndex][$scope.editableColumnName]){
      rowEditMode($scope.editableIndex);       

      var requiredField = _.find($scope.currentProject.currentTable.columns, function(everyCol){
        if(everyCol.name!=$scope.editableColumnName && everyCol.name!="id" && everyCol.name!="createdAt" && everyCol.name!="updatedAt" && everyCol.name!="ACL" && everyCol.required){
          if(!$scope.editableRow.get(everyCol.name)){
            return everyCol;
          }          
        }
      });

      if($scope.editableColumn.dataType=="Number"){
        var tempValue=angular.copy($scope.editableField[$scope.editableIndex][$scope.editableColumnName]);
        $scope.editableField[$scope.editableIndex][$scope.editableColumnName]=parseInt($scope.editableField[$scope.editableIndex][$scope.editableColumnName]);
        if(isNaN($scope.editableField[$scope.editableIndex][$scope.editableColumnName])){
          $scope.editableField[$scope.editableIndex][$scope.editableColumnName]=tempValue;
        }
      }

      //Check for null DateTime
      if($scope.editableColumn.dataType=="DateTime"){
        if($scope.editableField[$scope.editableIndex][$scope.editableColumnName].getTime()==new Date(null).getTime()){
          $scope.editableField[$scope.editableIndex][$scope.editableColumnName]=null;
        }
      }

      $scope.editableRow.set($scope.editableColumnName,$scope.editableField[$scope.editableIndex][$scope.editableColumnName]);
      if(requiredField){      
        rowWarningMode($scope.editableIndex,$scope.editableRow,$scope.editableColumnName);          
      }else{
        rowSpinnerMode($scope.editableIndex);          
      
        //Save Cloud Object
        $scope.saveCloudObject($scope.editableRow)
        .then(function(obj){               
          showSaveIconInSecond($scope.editableIndex);
        }, function(error){                         
          rowErrorMode($scope.editableIndex,error);   
        });
      }
  }
}
//End of Save 

//Save for relation table 
$scope.saveRelationObj=function(relCloudObject){
  if(!checkRelationErrors()){  

    $scope.relationSpinnerMode=true;   
   
    var index=$scope.relatedTableDefArray.length-1;
    var table=$scope.relatedTableDefArray[index];            

    //check for rquired columns
    var colNames=null;
    for(var i=0;i<table.columns.length;++i){
        var col=table.columns[i];
        if(col.name!="id" && col.name!="createdAt" && col.name!="updatedAt" && col.name!="ACL" && col.required){
            if(!relCloudObject.get(col.name)){
              colNames=colNames.concat(col.name+","); 
            }          
        }
    }
     
    if(colNames){
      $scope.relationSpinnerMode=false;
      $scope.relationErrorMode="Not Saved! These "+colNames+" are required";           
    }else{
      $scope.relationErrorMode=null;
      $scope.relationSpinnerMode=true;      

      //Save Cloud Object
      $scope.saveCloudObject(relCloudObject)
      .then(function(obj){
        //Convert ISO to dateObj 
        convertISO2DateObj(table,relCloudObject);

        $scope.relationSpinnerMode=false;
        $scope.relationSaveTickMode=true;
        $timeout(function(){ 
          $scope.relationSaveTickMode=false;          
        }, 1000); 

        //Nullify errors
        clearRelationErrors();
        $scope.closeRelModal();

      }, function(error){ 
        $scope.relationSpinnerMode=false;   
        $scope.relationErrorMode=error;            
      });
    }

  }           
    
};
//End of Save for relation table  

$scope.removeRelErrors=function(){
  $scope.relationErrorMode=null;
};

$scope.saveCloudObject = function(obj){
  var q=$q.defer(); 

  //save the object.
  obj.save({ success: function(newObj){ 
    q.resolve(newObj);  
  },error: function(err) {
    q.reject(err);                  
   //$scope.$digest();
  }
  });

  return  q.promise;      
}; 

/* PRIVATE FUNCTIONS */

function loadProject(id){

  if($rootScope.currentProject){
    initCbApp();
    getProjectTables();
  }else{
    projectService.getProject(id)
    .then(function(currentProject){
        if(currentProject){
          $rootScope.currentProject=currentProject;
          initCbApp();
          getProjectTables();                                        
        }                                           
    },
    function(error){ 
      errorNotify('We cannot load your project at this point in time. Please try again later.');        
    });
  }
  
}

function getProjectTables(){
  var promises=[];  

  if(!$rootScope.currentProject.tables || $rootScope.currentProject.tables.length==0){
    //Get All project tables
    promises.push(tableService.getProjectTables($rootScope.currentProject));     
  }else{
    $rootScope.currentProject.currentTable= _.first(_.where($rootScope.currentProject.tables, {name: tableName}));   
  }  

  $q.all(promises).then(function(list){ 

    if(list.length==1){      
      $rootScope.currentProject.tables=list[0];
      $rootScope.currentProject.currentTable= _.first(_.where($rootScope.currentProject.tables, {name: tableName}));      
    }

    for(var i=0;i<$rootScope.currentProject.currentTable.columns.length;++i){
      $scope.hideColumn[i]=true;
    }

    return $scope.loadTableData($rootScope.currentProject.currentTable,$scope.orderBy,$scope.orderByType,10,0);

  }).then(function(cbObjects){ 
    $scope.currentTableData=cbObjects;
    $scope.totalRecords=10;
    $scope.isTableLoaded=true; 

    for(var i=0;i<$scope.currentTableData.length;++i){
      $scope.showSerialNo[i]=true;
      $scope.holdeSerialNoInfo[i]=true;
    }
  }, function(err){  
    $scope.isTableLoaded=true; 
    $scope.tableLoadedError="Error in loading table records";
  });

} 

function getProjectTableByName(tableDefName){
  var q=$q.defer();

  tableService.getProjectTableByName(tableDefName)
  .then(function(table){
      q.resolve(table);
  }, function(error){ 
     q.reject(error);      
  });

  return  q.promise;
}  

function initCbApp(){
  CB.CloudApp.init($rootScope.currentProject.appId,$rootScope.currentProject.keys.master);    
}

$scope.addMoreRecords=function(){  

  if($scope.currentTableData && $rootScope.currentProject && $rootScope.currentProject.currentTable){
    $scope.loadingRecords=true;
    //load more data
    $scope.loadTableData($rootScope.currentProject.currentTable,$scope.orderBy,$scope.orderByType,5,$scope.totalRecords)
    .then(function(list){
      if(list && list.length>0){
        if($scope.currentTableData.length>0){
          $scope.currentTableData=$scope.currentTableData.concat(list); 
        }else{
          $scope.currentTableData=list;
        }
        $scope.totalRecords=$scope.totalRecords+list.length;
      } 
      $scope.loadingRecords=false;       
      //$scope.$digest();                                      
    },
    function(error){ 
    $scope.loadingRecords=false;      
    });
    //end of load more data
  }     
 
};

/*------Partial & Table Definition Functions---------------*/ 

$scope.goToTables=function(){
  window.location.href="#/"+id+"/table";
};

$scope.goToDataBrowser=function(t){  
  $("#md-searchreldocument").modal("hide"); 
  $("#md-searchlistdocument").modal("hide");     
  window.location.href="#/"+id+"/table/"+t.name;
};

$scope.filterDataType=function(dataTypeObj){
  if(dataTypeObj.type!="List" && dataTypeObj.type!="Relation" && dataTypeObj.name!="EncryptedText"){
    return dataTypeObj;
  }
};

$scope.initiateColumnSettings = function() {
  var newColName="newColumn";
  var incrementor=0;
  (function iterator(i) {
          $scope.checkErrorsForCreate(newColName,$rootScope.currentProject.currentTable.columns,"column");
          if($scope.columnErrorForCreate){
            ++incrementor;
            newColName="newColumn"+incrementor;
            iterator(i+1);
          }
  })(0);          

  var uniqueId=utilityService.makeId(); 

  var newcol = {
      id:uniqueId,
      name: newColName,
      dataType: 'Text',
      relatedTo: null,
      relationType: null,
      required: false,
      unique: false,
      isRenamable: true,
      isEditable: true,
      isDeletable: true,
  }; 

  $scope.newColumnObj=newcol; 
  $scope.showAddColPopUp=true;   
  //$("#scrollbar-wrapper").mCustomScrollbar("scrollTo",['top','right']); 
  $('#scrollbar-wrapper').scrollTo('#extra-col-th',400,{axis:'x',duration:5000});   
  
};
//infinite-scroll="addMoreRecords()"
$scope.addColumn = function(valid) {
  if(valid){
    $scope.showAddColPopUp=false; 
    nullifyCommonErrorInfo();
    $scope.commonSpinner=true;

    var column = new CB.Column($scope.newColumnObj.name, $scope.newColumnObj.dataType, $scope.newColumnObj.required, $scope.newColumnObj.unique);
    if($scope.newColumnObj.relatedTo){
      column.relatedTo=$scope.newColumnObj.relatedTo;
    }
    $rootScope.currentProject.currentTable.addColumn(column);
    var index=$rootScope.currentProject.currentTable.columns.indexOf(column);
    //Column visible
    $scope.hideColumn[index]=true;

    /*$rootScope.currentProject.currentTable.columns.push($scope.newColumnObj);
    $("#scrollbar-wrapper").mCustomScrollbar("update");
    $(".data-table-design").css("height","75.90vh");
    $timeout(function(){ 
      $(".data-table-design").css("height","76vh");
      $("#scrollbar-wrapper").mCustomScrollbar("scrollTo",['top','right']); 
    }, 2000);*/

    $('#scrollbar-wrapper').scrollTo('#extra-col-th',400,{axis:'x',duration:5000}); 

    tableService.saveTable($rootScope.currentProject.currentTable)
    .then(function(table){  
      $('#scrollbar-wrapper').scrollTo('#extra-col-th',400,{axis:'x',duration:5000});       
      $scope.newColumnObj=null;
      $scope.commonSpinner=false; 
      $scope.commonSaved=true;
      $timeout(function(){ 
        $scope.commonSaved=false;
      }, 800);                                                 
    },
    function(error){      
      $scope.commonSpinner=false;
      $scope.commonError="Unable to add the column right now";      
      $rootScope.currentProject.currentTable.columns.splice(index,1)            
    });

    //Update Beacon
    if($scope.beacon && !$scope.beacon.firstColumn){
      $scope.beacon.firstColumn=true;
      updateBeacon();   
    }
  }            
};

$scope.cancelAddNewCol=function(){
  $scope.showAddColPopUp=false;   
};

$scope.toggleColOptions=function(index){
  if((!$scope.showColOptions[index]) || ($scope.showColOptions[index]==false)){
    $scope.showColOptions[index]=true;
  }else if($scope.showColOptions[index]==true){
    $scope.showColOptions[index]=false;
  }    
};

$scope.confirmDeleteColumn=function(column){
  if(column.document.isDeletable){    
    var tempTable=angular.copy($scope.currentProject.currentTable);  
    for(var i=0;i<tempTable.columns.length;++i){
      if(tempTable.columns[i].name==column.name){
        $scope.requestDelIndex=i;
        break;
      }
    }    
    $scope.showColOptions[$scope.requestDelIndex]=false;

    $scope.requestedColumn=column;
    $scope.confirmDeleteColumnName=null;
    $scope.columnDeleteModalSpinner=false;    
    $("#md-deleteColumn").modal();     
  }
};

$scope.deleteColumn=function(){
  if($scope.requestedColumn.name==$scope.confirmDeleteColumnName){
    //Hold
    var tempTable=angular.copy($scope.currentProject.currentTable); 

    //Delete
    var column = new CB.Column($scope.requestedColumn.name, $scope.requestedColumn.dataType);
    $scope.currentProject.currentTable.deleteColumn(column);  

    $scope.columnDeleteModalSpinner=true;  

    tableService.saveTable($scope.currentProject.currentTable)
    .then(function(table){     
      //Sanitize hide column
      $scope.hideColumn.splice($scope.requestDelIndex,1);   
      $scope.confirmDeleteColumnName=null;
      $scope.columnDeleteModalSpinner=false;
      $scope.requestedColumn=null;
      $scope.requestDelIndex=null; 
      $("#md-deleteColumn").modal("hide"); 

    },function(error){
      
      $scope.confirmDeleteColumnName=null;
      $scope.columnDeleteModalSpinner=false;
      $scope.columnDeleteModalError="Unable to delete the column right now";     
      //ReAssign
      $rootScope.currentProject.currentTable=tempTable;
    });    
  }else{     
    $scope.confirmDeleteColumnName=null;
    $scope.columnDeleteModalSpinner=false;    
    $scope.columnDeleteModalError="Column name doesn\'t match";    
  }
};

$scope.clearDeleteColumnData=function(){
  $scope.confirmDeleteColumnName=null;
  $scope.columnDeleteModalSpinner=false;
  $scope.requestedColumn=null;
  $scope.requestDelIndex=null; 
  $("#md-deleteColumn").modal("hide");
};


//Row delete specific functions start
$scope.selectAllRows=function(){
 
  if($scope.areSelectAllRows==false){

    for(var i=0;i<$scope.currentTableData.length;++i){
      $scope.rowsSelected[i]=true;
      $scope.showSerialNo[i]=false;
      $scope.holdeSerialNoInfo[i]=false;
    }
    $scope.selectedRowsCount=$scope.currentTableData.length;

  }else if($scope.areSelectAllRows==true){
    for(var i=0;i<$scope.currentTableData.length;++i){
      $scope.rowsSelected[i]=false;
      $scope.showSerialNo[i]=true;
      $scope.holdeSerialNoInfo[i]=true;
    }
    $scope.selectedRowsCount=0;    
  }
};

$scope.selectThisRow=function(index){ 
  $scope.areSelectAllRows=false;   
  if($scope.rowsSelected[index]==false){
    ++$scope.selectedRowsCount;
  }else if($scope.rowsSelected[index]==true){
    if($scope.selectedRowsCount!=0){
      --$scope.selectedRowsCount;
    }      
  }
};

$scope.deleteSelectedRows=function(){
  deleteUnsavedRows();//delete rows which doesn't have Id
  nullifyCommonErrorInfo();
  $scope.commonSpinner=true;

  var promises=[];
  for(var i=0;i<$scope.rowsSelected.length;++i){
    if($scope.rowsSelected[i]==true){        
      promises.push($scope.deleteCloudObject($scope.currentTableData[i]));
    }
  }

  $q.all(promises).then(function(list){ 
    
    for(var i=0;i<list.length;++i){
     var ndex=$scope.currentTableData.indexOf(list[i]);
     $scope.currentTableData.splice(ndex,1);
     $scope.rowsSelected.splice(ndex,1);
     $scope.showSerialNo.splice(ndex,1); 
     $scope.holdeSerialNoInfo.splice(ndex,1);  
     --$scope.selectedRowsCount;
    } 
    $scope.areSelectAllRows=false; 
    $scope.commonSpinner=false; 
    $scope.commonSaved=true;
    $timeout(function(){ 
      $scope.commonSaved=false; 
    }, 800);                            
  }, function(err){    
    $scope.areSelectAllRows=false;
    $scope.commonSpinner=false;
    $scope.commonError="Unable to add the column right now"; 
  });
 
};

function deleteUnsavedRows(){  
  for(var i=0;i<$scope.rowsSelected.length;++i){

    if(($scope.rowsSelected[i]==true) && (!$scope.currentTableData[i].get("id"))){
      $scope.currentTableData.splice(i,1); 
      $scope.rowsSelected.splice(i,1); 
      $scope.showSerialNo.splice(i,1);
      $scope.holdeSerialNoInfo.splice(i,1);  
      --$scope.selectedRowsCount;      
    }

  }      
}

$scope.deleteCloudObject = function(obj){
  var q=$q.defer();

  obj.delete().then(function(obj){    
    q.resolve(obj);
  }, function(error){ 
    q.reject(error);
  });

  return  q.promise;
};
//Row delete specific functions end  

$scope.checkErrorsForCreate=function(name,arrayList,type){
  var result=tableErrorService.checkErrorsForCreate(name,arrayList,type);
  if(result){
      if(type=="table"){
        $scope.tableErrorForCreate=result;
      }
      if(type=="column"){
        $scope.columnErrorForCreate=result;
      }

  }else{
    $scope.tableErrorForCreate=null;
    $scope.columnErrorForCreate=null;
  }

}; 

$scope.addRow=function(){    
  var obj = new CB.CloudObject($rootScope.currentProject.currentTable.name);
  obj.set('createdAt', new Date());
  obj.set('updatedAt', new Date());     
  $scope.currentTableData.push(obj);

  var index=$scope.currentTableData.indexOf(obj);
  $scope.showSerialNo[index]=true;
  $scope.holdeSerialNoInfo[index]=true;

  //Update Beacon
  if($scope.beacon && !$scope.beacon.firstRow){
    $scope.beacon.firstRow=true;
    updateBeacon();   
  }                                         
};

$scope.sortASC=function(column){  

  if($scope.currentTableData && $rootScope.currentProject && $rootScope.currentProject.currentTable){
    //$scope.isTableLoaded=false;
    $scope.loadingRecords=true;

    var i = $scope.currentProject.currentTable.columns.indexOf(column); 
    $scope.showColOptions[i]=false;  

    $scope.orderBy=column.name;
    $scope.orderByType="asc";    

    $scope.loadTableData($rootScope.currentProject.currentTable,$scope.orderBy,$scope.orderByType,10,0)
    .then(function(list){ 

       $scope.currentTableData=list; 
       $scope.showColOptions[i]=false;        
       //$scope.isTableLoaded=true;
       $scope.loadingRecords=false;
       $scope.totalRecords=10;

    },function(error){ 
      errorNotify(error); 
      $scope.loadingRecords=false;       
    });
    
  }
};

$scope.sortDESC=function(column){
  if($scope.currentTableData && $rootScope.currentProject && $rootScope.currentProject.currentTable){
    //$scope.isTableLoaded=false;
    $scope.loadingRecords=true;

    var i = $scope.currentProject.currentTable.columns.indexOf(column);  
    $scope.showColOptions[i]=false; 

    $scope.orderBy=column.name;
    $scope.orderByType="desc";
    $scope.loadTableData($rootScope.currentProject.currentTable,$scope.orderBy,$scope.orderByType,10,0)
    .then(function(list){ 

       $scope.currentTableData=list; 
       $scope.showColOptions[i]=false;        
       //$scope.isTableLoaded=true;
       $scope.loadingRecords=false;
       $scope.totalRecords=10;

    },function(error){
      errorNotify(error); 
      $scope.loadingRecords=false;        
    });
    
  }
};
/****Hide Columns******/
$scope.hideThisColumn=function(column){
  var i = $scope.currentProject.currentTable.columns.indexOf(column);
  $scope.showColOptions[i]=false;
  $scope.hideColumn[i]=false;
  ++$scope.hiddenColumnCount;
};

$scope.toggleHideColumn=function(index){
  var status=$scope.hideColumn[index];

  if(!status){
    $scope.hideColumn[index]=false;
    --$scope.hiddenColumnCount;
  }else if(status==true){
    $scope.hideColumn[index]=true; 
    ++$scope.hiddenColumnCount;    
  }  

};

$scope.showallHiddenCols=function(){
  for(var i=0; i<$scope.currentProject.currentTable.columns.length;++i){
    if($scope.currentProject.currentTable.columns[i].dataType!="Id"){
      if($scope.hideColumn[i]!=true){
          $scope.hideColumn[i]=true; 
          --$scope.hiddenColumnCount;
      }      
    }           
  }
};

$scope.hideallHiddenCols=function(){
  for(var i=0; i<$scope.currentProject.currentTable.columns.length;++i){
    if($scope.currentProject.currentTable.columns[i].dataType!="Id"){
      if($scope.hideColumn[i]!=false){
          $scope.hideColumn[i]=false; 
          ++$scope.hiddenColumnCount;
      }        
    }           
  }
};
/****End Hide Columns******/
$scope.toggleHiddenColShow=function(){
  if($scope.showHiddenColList==true){
    $scope.showHiddenColList=false;
  }else if($scope.showHiddenColList==false){
    $scope.showHiddenColList=true;
  }
  
};

$scope.editThisColumn=function(column){
  var i = $scope.currentProject.currentTable.columns.indexOf(column);       
  $scope.editColumn[i]=true;
};

$scope.cancelConfigCol=function(column){
  var i = $scope.currentProject.currentTable.columns.indexOf(column);       
  $scope.editColumn[i]=false;
  $scope.showColOptions[i]=false;
};

$scope.saveConfigCol=function(column){
  if(column.document.isEditable){
    var i = $scope.currentProject.currentTable.columns.indexOf(column);      
    nullifyCommonErrorInfo();
    $scope.commonSpinner=true;

    tableService.saveTable(id,$scope.currentProject.currentTable)
    .then(function(table){ 
      $scope.editColumn[i]=false;      
      $scope.showColOptions[i]=false; 
      $scope.commonSpinner=false; 
      $scope.commonSaved=true;
      $timeout(function(){ 
        $scope.commonSaved=false;        
      }, 800);                             
    },function(error){
      $scope.commonSpinner=false;
      $scope.commonError="Unable to add the column right now";      
    });      
  }
};

$scope.getType = function(x) {
  return typeof x;
};

$scope.isDate = function(x) {
  return x instanceof Date;
};


$scope.geoPointValidation=function(type,value){
  $scope.geopointEditError=null;
  if(type=="latitude"){

      if(!value || value<-90 || value>90){
        $scope.geopointEditError={
          type:type,
          msg:"Latitude must be in between -90 to 90"
        };
        
      }else{
        $scope.geopointEditError=null;
      }    
  }
  if(type=="longitude"){

      if(!value || value<-180 || value>180){
        $scope.geopointEditError={
          type:type,
          msg:"Longitude must be in between -180 to 180"
        };
      }else{
        $scope.geopointEditError=null;
      }    
  }
  return $scope.geopointEditError;
};

//Row focused functions
function rowInitMode(index){
  $scope.rowInfo=null;
  $scope.rowEditMode[index]=false;
  $scope.rowWarningMode[index]=false;
  $scope.rowErrorMode[index]=false;
  $scope.rowSpinnerMode[index]=false; 
  $scope.rowSavedMode[index]=false;
}

function rowEditMode(index){
  $scope.rowInfo=null;
  $scope.rowEditMode[index]=true;
  $scope.rowWarningMode[index]=false;
  $scope.rowErrorMode[index]=false;
  $scope.rowSpinnerMode[index]=false; 
  $scope.rowSavedMode[index]=false;
}

function rowWarningMode(index,row,columnName){
  var colNames="";
  for(var i=0;i<$scope.currentProject.currentTable.columns.length;++i){
    var col=$scope.currentProject.currentTable.columns[i];
    if(col.name!=columnName && col.name!="id" && col.name!="createdAt" && col.name!="updatedAt" && col.name!="ACL" && col.required){
        if(!row.get(col.name)){
          colNames=colNames.concat(col.name+","); 
        }          
    }
  }

  $scope.rowInfo="This row is not saved because these "+colNames+" are required";

  $scope.rowEditMode[index]=false;
  $scope.rowWarningMode[index]=true;
  $scope.rowErrorMode[index]=false;
  $scope.rowSpinnerMode[index]=false; 
  $scope.rowSavedMode[index]=false;
}

function rowErrorMode(index,error){
  $scope.rowInfo=error;
  $scope.rowEditMode[index]=false;
  $scope.rowWarningMode[index]=false;
  $scope.rowErrorMode[index]=true;
  $scope.rowSpinnerMode[index]=false; 
  $scope.rowSavedMode[index]=false;  
}

function rowSpinnerMode(index){
  $scope.rowInfo=null;
  $scope.rowEditMode[index]=false;
  $scope.rowWarningMode[index]=false;
  $scope.rowErrorMode[index]=false;
  $scope.rowSpinnerMode[index]=true; 
  $scope.rowSavedMode[index]=false; 
}

function rowSavedMode(index){
  $scope.rowInfo=null;
  $scope.rowEditMode[index]=false;
  $scope.rowWarningMode[index]=false;
  $scope.rowErrorMode[index]=false;
  $scope.rowSpinnerMode[index]=false; 
  $scope.rowSavedMode[index]=true;  

  //Update SerialNo Info  
  $scope.showSerialNo=angular.copy($scope.holdeSerialNoInfo); 
}

$scope.flipCheckBox=function(index){
  //Gather Info whatever(Order is important, this should be first)
  if(!$scope.showSerialNo[index]){
    $scope.holdeSerialNoInfo[index]=true;
  }else if($scope.showSerialNo[index]){
    $scope.holdeSerialNoInfo[index]=false;
  }

  if(!$scope.showSerialNo[index] && !$scope.rowsSelected[index]){
    $scope.showSerialNo[index]=true;
  }else if($scope.showSerialNo[index]){
    $scope.showSerialNo[index]=false;
  }    
};

function nullifyCommonErrorInfo(){
  $scope.commonSpinner=false;
  $scope.commonSaved=false;
  $scope.commonError=null;
  $scope.commonWarning=null;  
}

function showSaveIconInSecond(index){  
  rowSavedMode(index);
  $timeout(function(){ 
    rowInitMode(index);
  }, 1000);
}

/*------/Partial & Table Definition Functions---------------*/ 

//Toggling popups
$scope.closeTableMenu=function(){
  if($scope.showTableList){
    $scope.showTableList=false;
  }  
};

$scope.closeHideColBox=function(){
  if($scope.showHiddenColList==true){
    $scope.showHiddenColList=false;
  }
};

$scope.closeColConfig=function(index){
  $scope.showColOptions[index]=false;
};
$scope.closeAddCol=function(){
  $scope.showAddColPopUp=false;
};
//End Toggling popups

$scope.goToDocumentation=function(){
  //Update Beacon
  if($scope.beacon && !$scope.beacon.documentationLink){
    $scope.beacon.documentationLink=true;
    updateBeacon();   
  }

  //Redirect to documentation  
  window.open("https://docs.cloudboost.io", "_blank");
};

//get Beacon Obj from backend
function getBeacon(){
  beaconService.getBeacon()         
  .then(function(beaconObj){
      $scope.beacon=beaconObj;
      //Start the beacon
      initBeacon();                            
  },function(error){      
  });
}

//update Beacon
function updateBeacon(){   
  beaconService.updateBeacon($scope.beacon)         
  .then(function(beaconObj){
      //$scope.beacon=beaconObj;                            
  },function(error){      
  });
}

function initBeacon(){
  var x = 0;
  addCircleToDoc(x);
  addCircleToCol(x);
  addCircleToRow(x);
  setInterval(function () {
      if (x === 0) {
          x = 1;
      }
      addCircleToDoc(x);
      addCircleToCol(x);
      addCircleToRow(x);
      x++;
  }, 1200);
} 

function addCircleToDoc(id) {
  $('.first-data-beacon-container').append('<div  id="' + id + '" class="circlepulse2 first-data-beacon"></div>');

  $('#' + id).animate({
      'width': '50px',
      'height': '50px',
      'margin-top': '-20px',
      'margin-left': '-20px',
      'opacity': '0'
  }, 4000, 'easeOutCirc');

  setInterval(function () {
      $('#' + id).remove();
  }, 4000);
}
function addCircleToCol(id) {
  $('.first-column-beacon-container').append('<div  id="' + id + '" class="circlepulse3 first-column-beacon"></div>');

  $('#' + id).animate({
      'width': '50px',
      'height': '50px',
      'margin-top': '-20px',
      'margin-left': '-20px',
      'opacity': '0'
  }, 4000, 'easeOutCirc');

  setInterval(function () {
      $('#' + id).remove();
  }, 4000);
}
function addCircleToRow(id) {
  $('.first-row-beacon-container').append('<div  id="' + id + '" class="circlepulse3 first-row-beacon"></div>');

  $('#' + id).animate({
      'width': '50px',
      'height': '50px',
      'margin-top': '-20px',
      'margin-left': '-20px',
      'opacity': '0'
  }, 4000, 'easeOutCirc');

  setInterval(function () {
      $('#' + id).remove();
  }, 4000);
}
function validateEmail(email){      
  if(email){
    var emailExp = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
    return emailExp.test(email);            
  }        
}
function validateURL(url){      
  if(url){
    var myRegExp =/^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/i;            
    return myRegExp.test(url);     
  }        
}
//Notification

function errorNotify(errorMsg){
  $.amaran({
      'theme'     :'colorful',
      'content'   :{
         bgcolor:'#EE364E',
         color:'#fff',
         message:errorMsg
      },
      'position'  :'top right'
  });
}

function successNotify(successMsg){
  $.amaran({
      'theme'     :'colorful',
      'content'   :{
         bgcolor:'#19B698',
         color:'#fff',
         message:successMsg
      },
      'position'  :'top right'
  });
}

function warningNotify(WarningMsg){
  $.amaran({
      'theme'     :'colorful',
      'content'   :{
         bgcolor:'#EAC004',
         color:'#fff',
         message:WarningMsg
      },
      'position'  :'top right'
  });
}

});
