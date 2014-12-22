<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;

class CreateGoalsTable extends Migration {

	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('goals', function(Blueprint $table)
		{
			$table->increments('id');
			$table->integer('match_id')->unsigned()->index()->nullable();
			$table->foreign('match_id')->references('id')->on('matches')->onDelete('set null');
			$table->integer('player_id')->unsigned()->index()->nullable();
			$table->foreign('player_id')->references('id')->on('players')->onDelete('set null');
			$table->timestamps();
		});
	}


	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::drop('goals');
	}

}
